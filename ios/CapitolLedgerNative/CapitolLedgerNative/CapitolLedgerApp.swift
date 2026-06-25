import SwiftUI

@main
struct CapitolLedgerApp: App {
    var body: some Scene {
        WindowGroup {
            CapitolLedgerRootView()
        }
    }
}

struct CapitolLedgerRootView: View {
    private var appURL: URL {
        let configuredURL = Bundle.main.object(forInfoDictionaryKey: "CapitolLedgerAppURL") as? String
        return URL(string: configuredURL ?? "https://project-qosv1.vercel.app")!
    }

    var body: some View {
        CapitolLedgerWebView(appURL: appURL)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}
