import Foundation
import StoreKit
import UIKit
import WebKit

final class CapitolLedgerPurchaseBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    private var foregroundObserver: NSObjectProtocol?
    private let storeKitService: CapitolLedgerStoreKitService
    private let trustedOrigin: CapitolLedgerTrustedOrigin

    init(storeKitService: CapitolLedgerStoreKitService, trustedOrigin: CapitolLedgerTrustedOrigin) {
        self.storeKitService = storeKitService
        self.trustedOrigin = trustedOrigin
        super.init()

        storeKitService.transactionUpdatePublisher = { [weak self] result in
            guard let self else { return false }
            return await self.publish(result)
        }
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.storeKitService.publishPendingTransactionUpdates()
            }
        }
    }

    deinit {
        if let foregroundObserver {
            NotificationCenter.default.removeObserver(foregroundObserver)
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard
            message.name == "capitolLedgerPurchase",
            message.frameInfo.isMainFrame,
            trustedOrigin.matches(message.frameInfo.securityOrigin),
            let pageURL = message.webView?.url,
            trustedOrigin.matches(pageURL)
        else {
            return
        }
        guard let purchaseMessage = decodePurchaseMessage(message.body) else {
            Task { @MainActor in
                _ = await publish(
                    CapitolLedgerNativePurchaseResult(
                        action: "unknown",
                        ok: false,
                        message: "The purchase message could not be read.",
                        pendingApproval: nil,
                        productId: nil,
                        signedTransactionJWS: nil,
                        transactionId: nil,
                        originalTransactionId: nil,
                        subscription: nil
                    )
                )
            }
            return
        }

        Task { @MainActor in
            await handle(purchaseMessage)
        }
    }

    @MainActor
    func publishCurrentEntitlement() async {
        await storeKitService.publishPendingTransactionUpdates()
        let result = await storeKitService.currentEntitlementResult()
        _ = await publish(result)
    }

    @MainActor
    private func handle(_ message: CapitolLedgerPurchaseMessage) async {
        switch message.action {
        case .purchase:
            let result = await storeKitService.purchase(message)
            if result.signedTransactionJWS != nil, result.transactionId != nil {
                await storeKitService.publishPendingTransactionUpdates()
            } else {
                _ = await publish(result)
            }
        case .restore:
            let result = await storeKitService.restore()
            await storeKitService.publishPendingTransactionUpdates()
            _ = await publish(result)
        case .manage:
            openSubscriptionManagement()
            _ = await publish(
                CapitolLedgerNativePurchaseResult(
                    action: message.action.rawValue,
                    ok: true,
                    message: "Opening App Store subscription management.",
                    pendingApproval: nil,
                    productId: nil,
                    signedTransactionJWS: nil,
                    transactionId: nil,
                    originalTransactionId: nil,
                    subscription: nil
                )
            )
        case .syncPending:
            await publishCurrentEntitlement()
        }
    }

    @MainActor
    private func publish(_ result: CapitolLedgerNativePurchaseResult) async -> Bool {
        guard let webView else { return false }
        guard let pageURL = webView.url, trustedOrigin.matches(pageURL) else { return false }
        guard let jsonData = try? JSONEncoder().encode(result), let json = String(data: jsonData, encoding: .utf8) else { return false }

        let script = """
        const result = JSON.parse(resultJSON);
        if (typeof window.__capitolWonkSyncAppStoreResult !== "function") {
          return { acceptedTransactionId: null, transactionAccepted: false };
        }
        return await window.__capitolWonkSyncAppStoreResult(result);
        """

        do {
            let response = try await webView.callAsyncJavaScript(
                script,
                arguments: ["resultJSON": json],
                in: nil,
                contentWorld: .page
            )
            guard let currentPageURL = webView.url, trustedOrigin.matches(currentPageURL) else { return false }
            guard
                let acknowledgement = response as? [String: Any],
                acknowledgement["transactionAccepted"] as? Bool == true,
                let acceptedTransactionId = acknowledgement["acceptedTransactionId"] as? String,
                let transactionId = result.transactionId,
                acceptedTransactionId == transactionId
            else {
                return false
            }
            return await accountDeletionFenceIsClear(in: webView)
        } catch {
            return false
        }
    }

    @MainActor
    private func accountDeletionFenceIsClear(in webView: WKWebView) async -> Bool {
        guard let pageURL = webView.url, trustedOrigin.matches(pageURL) else { return false }
        let script = """
        try {
          const deletionFenceKey = window.__capitolLedgerAccountDeletionFenceKey || "capitolwonk:account-deletion-fence";
          return window.localStorage.getItem(deletionFenceKey) !== "active";
        } catch {
          return false;
        }
        """
        do {
            return try await webView.callAsyncJavaScript(
                script,
                arguments: [:],
                in: nil,
                contentWorld: .page
            ) as? Bool == true
        } catch {
            return false
        }
    }

    @MainActor
    private func openSubscriptionManagement() {
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }) else {
            openSubscriptionSettingsURL()
            return
        }

        Task {
            do {
                try await AppStore.showManageSubscriptions(in: windowScene)
            } catch {
                openSubscriptionSettingsURL()
            }
        }
    }

    @MainActor
    private func openSubscriptionSettingsURL() {
        guard let url = URL(string: "https://apps.apple.com/account/subscriptions") else { return }
        UIApplication.shared.open(url)
    }

    private func decodePurchaseMessage(_ body: Any) -> CapitolLedgerPurchaseMessage? {
        if let dictionary = body as? [String: Any], JSONSerialization.isValidJSONObject(dictionary) {
            guard let data = try? JSONSerialization.data(withJSONObject: dictionary) else { return nil }
            return try? JSONDecoder().decode(CapitolLedgerPurchaseMessage.self, from: data)
        }

        if let data = body as? Data {
            return try? JSONDecoder().decode(CapitolLedgerPurchaseMessage.self, from: data)
        }

        if let text = body as? String, let data = text.data(using: .utf8) {
            return try? JSONDecoder().decode(CapitolLedgerPurchaseMessage.self, from: data)
        }

        return nil
    }
}
