import SwiftUI
import WebKit

struct CapitolLedgerWebView: UIViewRepresentable {
    let appURL: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        context.coordinator.storeKitService.start()

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: "window.__capitolLedgerNativeStoreKit = true;",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        configuration.userContentController.add(context.coordinator.purchaseBridge, name: "capitolLedgerPurchase")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.navigationDelegate = context.coordinator
        context.coordinator.purchaseBridge.webView = webView

        webView.load(URLRequest(url: appURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            webView.load(URLRequest(url: appURL))
        }
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "capitolLedgerPurchase")
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let storeKitService = CapitolLedgerStoreKitService()
        lazy var purchaseBridge = CapitolLedgerPurchaseBridge(storeKitService: storeKitService)

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in
                await purchaseBridge.publishCurrentEntitlement()
            }
        }
    }
}
