import Foundation
import StoreKit
import UIKit
import WebKit

final class CapitolLedgerPurchaseBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    private let storeKitService: CapitolLedgerStoreKitService

    init(storeKitService: CapitolLedgerStoreKitService) {
        self.storeKitService = storeKitService
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let purchaseMessage = decodePurchaseMessage(message.body) else {
            Task { @MainActor in
                publish(
                    CapitolLedgerNativePurchaseResult(
                        action: "unknown",
                        ok: false,
                        message: "The purchase message could not be read.",
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
        let result = await storeKitService.currentEntitlementResult()
        publish(result)
    }

    @MainActor
    private func handle(_ message: CapitolLedgerPurchaseMessage) async {
        switch message.action {
        case .purchase:
            publish(await storeKitService.purchase(message))
        case .restore:
            publish(await storeKitService.restore())
        case .manage:
            openSubscriptionManagement()
            publish(
                CapitolLedgerNativePurchaseResult(
                    action: message.action.rawValue,
                    ok: true,
                    message: "Opening App Store subscription management.",
                    productId: nil,
                    signedTransactionJWS: nil,
                    transactionId: nil,
                    originalTransactionId: nil,
                    subscription: nil
                )
            )
        }
    }

    @MainActor
    private func publish(_ result: CapitolLedgerNativePurchaseResult) {
        guard let webView else { return }
        guard let jsonData = try? JSONEncoder().encode(result), let json = String(data: jsonData, encoding: .utf8) else { return }

        let script = """
        (() => {
          const result = \(json);
          const publishResult = (nextResult) => {
            const publicResult = { ...nextResult };
            delete publicResult.signedTransactionJWS;
            if (publicResult.subscription) {
              window.localStorage.setItem("capitol-ledger:subscription", JSON.stringify(publicResult.subscription));
              window.dispatchEvent(new CustomEvent("capitol-ledger:subscription-changed", { detail: publicResult.subscription }));
            }
            window.dispatchEvent(new CustomEvent("capitol-ledger:native-purchase-result", { detail: publicResult }));
          };
          publishResult(result);
          if (result.signedTransactionJWS) {
            fetch("/api/account/subscription/app-store", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ signedTransactionJWS: result.signedTransactionJWS })
            })
              .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                publishResult({
                  ...result,
                  ok: response.ok && result.ok,
                  message: data.error || result.message,
                  serverSynced: response.ok,
                  subscription: data.subscription || result.subscription
                });
              })
              .catch(() => {
                publishResult({
                  ...result,
                  serverSynced: false,
                  message: "Purchase is active on this device. Account sync could not be reached."
                });
              });
          }
        })();
        """

        webView.evaluateJavaScript(script)
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
