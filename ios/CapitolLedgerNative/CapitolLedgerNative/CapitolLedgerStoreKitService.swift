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
    private var updatesTask: Task<Void, Never>?

    private struct VerifiedStoreKitTransaction {
        let transaction: Transaction
        let signedTransactionJWS: String
    }

    deinit {
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
            await self?.refreshCurrentEntitlement()
        }
    }

    func purchase(_ message: CapitolLedgerPurchaseMessage) async -> CapitolLedgerNativePurchaseResult {
        guard message.plan == .pro, let productId = message.productId, CapitolLedgerProduct.proProductIds.contains(productId) else {
            return result(action: message.action.rawValue, ok: false, message: "Only Pro is available for in-app purchase right now.")
        }

        do {
            let product = try await product(for: productId)
            let purchaseResult = try await product.purchase(options: purchaseOptions(for: message))

            switch purchaseResult {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await transaction.finish()
                let subscription = subscriptionSnapshot(for: transaction)
                currentSubscription = subscription

                return result(
                    action: message.action.rawValue,
                    ok: true,
                    message: "Pro is active.",
                    transaction: transaction,
                    signedTransactionJWS: verification.jwsRepresentation,
                    subscription: subscription
                )
            case .pending:
                return result(action: message.action.rawValue, ok: false, message: "Purchase is pending App Store approval.")
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

            let restored = currentSubscription.plan == CapitolLedgerPlan.pro.rawValue
            return result(
                action: CapitolLedgerPurchaseAction.restore.rawValue,
                ok: restored,
                message: restored ? "Pro purchase restored." : "No active Pro purchase was found.",
                transaction: entitlement?.transaction,
                signedTransactionJWS: entitlement?.signedTransactionJWS,
                subscription: currentSubscription
            )
        } catch {
            return result(action: CapitolLedgerPurchaseAction.restore.rawValue, ok: false, message: error.localizedDescription)
        }
    }

    func currentEntitlementResult() async -> CapitolLedgerNativePurchaseResult {
        let entitlement = await refreshCurrentEntitlement()

        return result(
            action: "entitlement",
            ok: currentSubscription.plan == CapitolLedgerPlan.pro.rawValue,
            message: currentSubscription.plan == CapitolLedgerPlan.pro.rawValue ? "Pro entitlement found." : "No active Pro entitlement found.",
            transaction: entitlement?.transaction,
            signedTransactionJWS: entitlement?.signedTransactionJWS,
            subscription: currentSubscription
        )
    }

    private func loadProducts() async {
        let products = (try? await Product.products(for: Array(CapitolLedgerProduct.proProductIds))) ?? []
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

    private func purchaseOptions(for message: CapitolLedgerPurchaseMessage) -> Set<Product.PurchaseOption> {
        guard let token = message.appAccountToken, let uuid = UUID(uuidString: token) else { return [] }
        return [.appAccountToken(uuid)]
    }

    private func handleTransactionUpdate(_ update: VerificationResult<Transaction>) async {
        guard let transaction = try? checkVerified(update) else { return }
        await transaction.finish()
        await refreshCurrentEntitlement()
    }

    @discardableResult
    private func refreshCurrentEntitlement() async -> VerifiedStoreKitTransaction? {
        var activeEntitlement: VerifiedStoreKitTransaction?

        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(entitlement) else { continue }
            guard CapitolLedgerProduct.proProductIds.contains(transaction.productID) else { continue }
            guard isActive(transaction) else { continue }

            if activeEntitlement == nil || (transaction.expirationDate ?? .distantFuture) > (activeEntitlement?.transaction.expirationDate ?? .distantPast) {
                activeEntitlement = VerifiedStoreKitTransaction(
                    transaction: transaction,
                    signedTransactionJWS: entitlement.jwsRepresentation
                )
            }
        }

        currentSubscription = activeEntitlement.map { subscriptionSnapshot(for: $0.transaction) } ?? Self.freeSubscription()
        return activeEntitlement
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
        let active = isActive(transaction)

        return CapitolLedgerSubscriptionSnapshot(
            cycle: cycle.rawValue,
            plan: active ? CapitolLedgerPlan.pro.rawValue : CapitolLedgerPlan.free.rawValue,
            provider: "app-store",
            providerCustomerId: "app-store",
            providerEntitlementId: transaction.productID,
            providerSubscriptionId: String(transaction.originalID),
            seatCount: nil,
            status: active ? "active" : "canceled",
            updatedAt: ISO8601DateFormatter.capitolLedger.string(from: Date())
        )
    }

    private func result(
        action: String,
        ok: Bool,
        message: String,
        transaction: Transaction? = nil,
        signedTransactionJWS: String? = nil,
        subscription: CapitolLedgerSubscriptionSnapshot? = nil
    ) -> CapitolLedgerNativePurchaseResult {
        CapitolLedgerNativePurchaseResult(
            action: action,
            ok: ok,
            message: message,
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
}
