import SwiftUI
import UIKit
import WebKit

struct CapitolLedgerTrustedOrigin {
    let host: String
    let port: Int
    let scheme: String

    init(appURL: URL) {
        scheme = appURL.scheme?.lowercased() ?? ""
        host = appURL.host?.lowercased() ?? ""
        port = Self.normalizedPort(scheme: scheme, port: appURL.port)
    }

    func matches(_ url: URL) -> Bool {
        let candidateScheme = url.scheme?.lowercased() ?? ""
        return candidateScheme == scheme &&
            url.host?.lowercased() == host &&
            Self.normalizedPort(scheme: candidateScheme, port: url.port) == port
    }

    func matches(_ origin: WKSecurityOrigin) -> Bool {
        let candidateScheme = origin.protocol.lowercased()
        return candidateScheme == scheme &&
            origin.host.lowercased() == host &&
            Self.normalizedPort(scheme: candidateScheme, port: origin.port) == port
    }

    private static func normalizedPort(scheme: String, port: Int?) -> Int {
        if let port, port > 0 { return port }
        if scheme == "https" { return 443 }
        if scheme == "http" { return 80 }
        return -1
    }
}

struct CapitolLedgerWebView: UIViewRepresentable {
    let appURL: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(appURL: appURL)
    }

    func makeUIView(context: Context) -> WKWebView {
        context.coordinator.storeKitService.start()

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: """
                window.__capitolLedgerNativeStoreKit = true;
                window.__capitolLedgerAccountDeletionFenceKey = "capitolwonk:account-deletion-fence";
                """,
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
        let purchaseBridge: CapitolLedgerPurchaseBridge
        let storeKitService: CapitolLedgerStoreKitService
        let trustedOrigin: CapitolLedgerTrustedOrigin

        init(appURL: URL) {
            let storeKitService = CapitolLedgerStoreKitService()
            let trustedOrigin = CapitolLedgerTrustedOrigin(appURL: appURL)
            self.storeKitService = storeKitService
            self.trustedOrigin = trustedOrigin
            purchaseBridge = CapitolLedgerPurchaseBridge(
                storeKitService: storeKitService,
                trustedOrigin: trustedOrigin
            )
            super.init()
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            let targetsMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
            guard targetsMainFrame else {
                decisionHandler(.allow)
                return
            }
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            guard !trustedOrigin.matches(url) else {
                decisionHandler(.allow)
                return
            }

            let externalSchemes = Set(["http", "https", "mailto", "tel"])
            if navigationAction.navigationType == .linkActivated,
               let scheme = url.scheme?.lowercased(),
               externalSchemes.contains(scheme) {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in
                await purchaseBridge.publishCurrentEntitlement()
            }
        }
    }
}
