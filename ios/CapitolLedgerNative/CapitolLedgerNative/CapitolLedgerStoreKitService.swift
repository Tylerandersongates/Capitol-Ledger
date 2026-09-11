import Foundation
import StoreKit

enum CapitolLedgerStoreKitError: LocalizedError {
    case invalidProduct
    case unverifiedTransaction

    var errorDescription: String? {
        switch self {
        case .invalidProduct:
            return "This App Store product is not available."
        case .unverifiedTransaction:
            return "The App Store transaction could not be verified."
        }
    }
}

@MainActor
final class CapitolLedgerStoreKitService: ObservableObject {
    @Published private(set) var currentSubscription = CapitolLedgerStoreKitService.freeSubscription()

    private var productsById: [String: Product] = [:]
    private var pendingTransactionUpdates: [UInt64: VerifiedStoreKitTransaction] = [:]
    private var pendingTransactionPublishInProgress = false
    private var pendingTransactionPublishRequested = false
    private var pendingTransactionRetryAttempt = 0
    private var pendingTransactionRetryTask: Task<Void, Never>?
    private var updatesTask: Task<Void, Never>?
    var transactionUpdatePublisher: ((CapitolLedgerNativePurchaseResult) async -> Bool)?

    private struct VerifiedStoreKitTransaction {
        let action: String
        let transaction: Transaction
        let signedTransactionJWS: String
    }

    deinit {
        pendingTransactionRetryTask?.cancel()
        updatesTask?.cancel()
    }

    func start() {
        guard updatesTask == nil else { return }

        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handleTransactionUpdate(update)
            }
        }

        Task { [weak self] in
            await self?.loadProducts()
            await self?.ingestUnfinishedTransactions()
            await self?.publishPendingTransactionUpdates()
            await self?.refreshCurrentEntitlement()
        }
    }

    func purchase(_ message: CapitolLedgerPurchaseMessage) async -> CapitolLedgerNativePurchaseResult {
        guard
            let token = message.appAccountToken,
            let appAccountToken = UUID(uuidString: token)
        else {
            return result(action: message.action.rawValue, ok: false, message: "CapitolWonk could not link this purchase to your account. Sign in again and retry.")
        }

        let selectedTeamSeatCount = message.plan == .team ? (message.seatCount ?? CapitolLedgerProduct.minimumTeamSeatCount) : nil
        guard
            let requestedPlan = message.plan,
            let productId = message.productId,
            CapitolLedgerProduct.productIds.contains(productId),
            CapitolLedgerProduct.plan(for: productId) == requestedPlan,
            requestedPlan != .team || CapitolLedgerProduct.seatCount(for: productId) == selectedTeamSeatCount
        else {
            return result(action: message.action.rawValue, ok: false, message: "This App Store product is not available for the selected plan.")
        }

        do {
            let product = try await product(for: productId)
            let purchaseResult = try await product.purchase(options: [.appAccountToken(appAccountToken)])

            switch purchaseResult {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                let subscription = subscriptionSnapshot(for: transaction)
                enqueueTransaction(
                    action: message.action.rawValue,
                    signedTransactionJWS: verification.jwsRepresentation,
                    transaction: transaction
                )
                currentSubscription = subscription

                return result(
                    action: message.action.rawValue,
                    ok: true,
                    message: activePlanName(for: subscription) + " is active.",
                    transaction: transaction,
                    signedTransactionJWS: verification.jwsRepresentation,
                    subscription: subscription
                )
            case .pending:
                return result(
                    action: message.action.rawValue,
                    ok: false,
                    message: "Purchase is pending App Store approval.",
                    pendingApproval: true
                )
            case .userCancelled:
                return result(action: message.action.rawValue, ok: false, message: "Purchase cancelled.")
            @unknown default:
                return result(action: message.action.rawValue, ok: false, message: "The App Store returned an unknown purchase result.")
            }
        } catch {
            return result(action: message.action.rawValue, ok: false, message: error.localizedDescription)
        }
    }

    func restore() async -> CapitolLedgerNativePurchaseResult {
        do {
            try await AppStore.sync()
            let entitlement = await refreshCurrentEntitlement()
            // currentEntitlements intentionally omits an expired transaction that is
            // in Apple's billing-retry state. For an explicit user-initiated restore,
            // pass the newest directly purchased subscription-history JWS to the
            // server so Apple's current status can make the authoritative decision.
            let restoreCandidate: VerifiedStoreKitTransaction?
            if let entitlement {
                restoreCandidate = entitlement
            } else {
                restoreCandidate = await latestSupportedPurchaseHistory()
            }

            let restored = restoreCandidate != nil
            let hasActiveEntitlement = entitlement != nil
            return result(
                action: CapitolLedgerPurchaseAction.restore.rawValue,
                ok: restored,
                message: hasActiveEntitlement
                    ? activePlanName(for: currentSubscription) + " purchase restored."
                    : restored
                        ? "App Store purchase history found. Confirming its current status with CapitolWonk."
                        : "No App Store subscription purchase was found.",
                transaction: restoreCandidate?.transaction,
                signedTransactionJWS: restoreCandidate?.signedTransactionJWS,
                subscription: currentSubscription
            )
        } catch {
            return result(action: CapitolLedgerPurchaseAction.restore.rawValue, ok: false, message: error.localizedDescription)
        }
    }

    func currentEntitlementResult() async -> CapitolLedgerNativePurchaseResult {
        let entitlement = await refreshCurrentEntitlement()
        let hasPaidEntitlement = currentSubscription.plan == CapitolLedgerPlan.pro.rawValue || currentSubscription.plan == CapitolLedgerPlan.team.rawValue

        return result(
            action: "entitlement",
            ok: hasPaidEntitlement,
            message: hasPaidEntitlement ? activePlanName(for: currentSubscription) + " entitlement found." : "No active App Store entitlement found.",
            transaction: entitlement?.transaction,
            signedTransactionJWS: entitlement?.signedTransactionJWS,
            subscription: currentSubscription
        )
    }

    private func loadProducts() async {
        let products = (try? await Product.products(for: Array(CapitolLedgerProduct.productIds))) ?? []
        productsById = Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0) })
    }

    private func product(for productId: String) async throws -> Product {
        if let product = productsById[productId] {
            return product
        }

        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
            throw CapitolLedgerStoreKitError.invalidProduct
        }

        productsById[product.id] = product
        return product
    }

    private func handleTransactionUpdate(_ update: VerificationResult<Transaction>) async {
        guard let transaction = try? checkVerified(update) else { return }
        guard CapitolLedgerProduct.productIds.contains(transaction.productID) else { return }

        enqueueTransaction(
            action: "transaction-update",
            signedTransactionJWS: update.jwsRepresentation,
            transaction: transaction
        )
        currentSubscription = subscriptionSnapshot(for: transaction)
        Task { [weak self] in
            await self?.publishPendingTransactionUpdates()
        }
        await refreshCurrentEntitlement()
    }

    func publishPendingTransactionUpdates() async {
        pendingTransactionRetryTask?.cancel()
        pendingTransactionRetryTask = nil
        pendingTransactionRetryAttempt = 0
        await drainPendingTransactionUpdates()
    }

    private func drainPendingTransactionUpdates() async {
        if pendingTransactionPublishInProgress {
            pendingTransactionPublishRequested = true
            return
        }

        pendingTransactionPublishInProgress = true
        defer { pendingTransactionPublishInProgress = false }

        repeat {
            pendingTransactionPublishRequested = false
            await ingestUnfinishedTransactions()
            guard let transactionUpdatePublisher else { break }

            let transactionIds = pendingTransactionUpdates.keys.sorted()
            for transactionId in transactionIds {
                guard let update = pendingTransactionUpdates[transactionId] else { continue }
                let subscription = subscriptionSnapshot(for: update.transaction)
                let accepted = await transactionUpdatePublisher(
                    result(
                        action: update.action,
                        ok: isActive(update.transaction),
                        message: isActive(update.transaction)
                            ? activePlanName(for: subscription) + " App Store update received."
                            : "App Store subscription update received.",
                        transaction: update.transaction,
                        signedTransactionJWS: update.signedTransactionJWS,
                        subscription: subscription
                    )
                )
                guard accepted else { continue }

                guard
                    let stillPending = pendingTransactionUpdates[transactionId],
                    stillPending.signedTransactionJWS == update.signedTransactionJWS
                else {
                    continue
                }
                await update.transaction.finish()
                if pendingTransactionUpdates[transactionId]?.signedTransactionJWS == update.signedTransactionJWS {
                    pendingTransactionUpdates.removeValue(forKey: transactionId)
                }
            }
        } while pendingTransactionPublishRequested

        if pendingTransactionUpdates.isEmpty {
            pendingTransactionRetryAttempt = 0
            pendingTransactionRetryTask?.cancel()
            pendingTransactionRetryTask = nil
        } else {
            schedulePendingTransactionRetry()
        }
    }

    private func schedulePendingTransactionRetry() {
        let delays: [UInt64] = [2, 5, 10, 20, 40, 60]
        guard
            pendingTransactionRetryTask == nil,
            pendingTransactionRetryAttempt < delays.count
        else {
            return
        }

        let delayNanoseconds = delays[pendingTransactionRetryAttempt] * 1_000_000_000
        pendingTransactionRetryAttempt += 1
        pendingTransactionRetryTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: delayNanoseconds)
            guard !Task.isCancelled, let self else { return }
            self.pendingTransactionRetryTask = nil
            await self.drainPendingTransactionUpdates()
        }
    }

    private func ingestUnfinishedTransactions() async {
        for await unfinished in Transaction.unfinished {
            guard let transaction = try? checkVerified(unfinished) else { continue }
            guard CapitolLedgerProduct.productIds.contains(transaction.productID) else { continue }

            enqueueTransaction(
                action: "transaction-update",
                signedTransactionJWS: unfinished.jwsRepresentation,
                transaction: transaction
            )
        }
    }

    private func enqueueTransaction(action: String, signedTransactionJWS: String, transaction: Transaction) {
        let existingAction = pendingTransactionUpdates[transaction.id]?.action
        pendingTransactionUpdates[transaction.id] = VerifiedStoreKitTransaction(
            action: existingAction ?? action,
            transaction: transaction,
            signedTransactionJWS: signedTransactionJWS
        )
    }

    @discardableResult
    private func refreshCurrentEntitlement() async -> VerifiedStoreKitTransaction? {
        var activeEntitlement: VerifiedStoreKitTransaction?

        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(entitlement) else { continue }
            guard CapitolLedgerProduct.productIds.contains(transaction.productID) else { continue }
            guard isActive(transaction) else { continue }

            if activeEntitlement == nil || (transaction.expirationDate ?? .distantFuture) > (activeEntitlement?.transaction.expirationDate ?? .distantPast) {
                activeEntitlement = VerifiedStoreKitTransaction(
                    action: "entitlement",
                    transaction: transaction,
                    signedTransactionJWS: entitlement.jwsRepresentation
                )
            }
        }

        currentSubscription = activeEntitlement.map { subscriptionSnapshot(for: $0.transaction) } ?? Self.freeSubscription()
        return activeEntitlement
    }

    private func latestSupportedPurchaseHistory() async -> VerifiedStoreKitTransaction? {
        var latest: VerifiedStoreKitTransaction?

        for await historyItem in Transaction.all {
            guard let transaction = try? checkVerified(historyItem) else { continue }
            guard CapitolLedgerProduct.productIds.contains(transaction.productID) else { continue }
            guard transaction.ownershipType == .purchased, transaction.revocationDate == nil else { continue }

            let candidate = VerifiedStoreKitTransaction(
                action: "restore",
                transaction: transaction,
                signedTransactionJWS: historyItem.jwsRepresentation
            )
            let candidateDate = transaction.expirationDate ?? transaction.purchaseDate
            let latestDate = latest.map { $0.transaction.expirationDate ?? $0.transaction.purchaseDate } ?? .distantPast
            if latest == nil || candidateDate > latestDate {
                latest = candidate
            }
        }

        return latest
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let signedType):
            return signedType
        case .unverified:
            throw CapitolLedgerStoreKitError.unverifiedTransaction
        }
    }

    private func isActive(_ transaction: Transaction) -> Bool {
        guard transaction.revocationDate == nil else { return false }
        guard let expirationDate = transaction.expirationDate else { return true }
        return expirationDate > Date()
    }

    private func subscriptionSnapshot(for transaction: Transaction) -> CapitolLedgerSubscriptionSnapshot {
        let cycle = CapitolLedgerProduct.cycle(for: transaction.productID) ?? .monthly
        let plan = CapitolLedgerProduct.plan(for: transaction.productID) ?? .free
        let active = isActive(transaction)

        return CapitolLedgerSubscriptionSnapshot(
            cycle: cycle.rawValue,
            plan: active ? plan.rawValue : CapitolLedgerPlan.free.rawValue,
            provider: "app-store",
            providerCustomerId: "app-store",
            providerEntitlementId: transaction.productID,
            providerSubscriptionId: String(transaction.originalID),
            seatCount: active ? CapitolLedgerProduct.seatCount(for: transaction.productID) : nil,
            status: active ? "active" : "canceled",
            updatedAt: ISO8601DateFormatter.capitolLedger.string(from: Date())
        )
    }

    private func result(
        action: String,
        ok: Bool,
        message: String,
        pendingApproval: Bool? = nil,
        transaction: Transaction? = nil,
        signedTransactionJWS: String? = nil,
        subscription: CapitolLedgerSubscriptionSnapshot? = nil
    ) -> CapitolLedgerNativePurchaseResult {
        CapitolLedgerNativePurchaseResult(
            action: action,
            ok: ok,
            message: message,
            pendingApproval: pendingApproval,
            productId: transaction?.productID,
            signedTransactionJWS: signedTransactionJWS,
            transactionId: transaction.map { String($0.id) },
            originalTransactionId: transaction.map { String($0.originalID) },
            subscription: subscription
        )
    }

    static func freeSubscription() -> CapitolLedgerSubscriptionSnapshot {
        CapitolLedgerSubscriptionSnapshot(
            cycle: CapitolLedgerCycle.monthly.rawValue,
            plan: CapitolLedgerPlan.free.rawValue,
            provider: "app-store",
            providerCustomerId: "app-store",
            providerEntitlementId: "capitol-ledger-free",
            providerSubscriptionId: "app-store-free",
            seatCount: nil,
            status: "active",
            updatedAt: ISO8601DateFormatter.capitolLedger.string(from: Date())
        )
    }

    private func activePlanName(for subscription: CapitolLedgerSubscriptionSnapshot) -> String {
        return subscription.plan == CapitolLedgerPlan.team.rawValue ? "Team" : "Pro"
    }
}
