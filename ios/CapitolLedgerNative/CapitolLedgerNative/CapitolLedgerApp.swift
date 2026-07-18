import Sentry
import SwiftUI

@main
struct CapitolLedgerApp: App {
    init() {
        guard
            let dsn = Bundle.main.object(forInfoDictionaryKey: "CapitolLedgerSentryDSN") as? String,
            !dsn.isEmpty,
            !dsn.contains("$(")
        else {
            return
        }

        SentrySDK.start { options in
            options.dsn = dsn
            options.sendDefaultPii = false
            options.tracesSampleRate = 0
        }
    }

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
