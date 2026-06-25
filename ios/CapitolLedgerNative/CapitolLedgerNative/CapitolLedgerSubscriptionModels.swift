import Foundation

enum CapitolLedgerPlan: String, Codable {
    case free
    case pro
    case team
}

enum CapitolLedgerCycle: String, Codable {
    case monthly
    case annual
}

enum CapitolLedgerPurchaseAction: String, Codable {
    case purchase
    case restore
    case manage
}

struct CapitolLedgerPurchaseMessage: Decodable {
    let action: CapitolLedgerPurchaseAction
    let appAccountToken: String?
    let cycle: CapitolLedgerCycle?
    let plan: CapitolLedgerPlan?
    let productId: String?
}

enum CapitolLedgerProduct {
    static let proMonthly = "com.capitolledger.pro.monthly"
    static let proAnnual = "com.capitolledger.pro.annual"
    static let proProductIds: Set<String> = [proMonthly, proAnnual]

    static func cycle(for productId: String) -> CapitolLedgerCycle? {
        switch productId {
        case proMonthly:
            return .monthly
        case proAnnual:
            return .annual
        default:
            return nil
        }
    }
}

struct CapitolLedgerSubscriptionSnapshot: Encodable {
    let cycle: String
    let plan: String
    let provider: String
    let providerCustomerId: String?
    let providerEntitlementId: String?
    let providerSubscriptionId: String?
    let seatCount: Int?
    let status: String
    let updatedAt: String
}

struct CapitolLedgerNativePurchaseResult: Encodable {
    let action: String
    let ok: Bool
    let message: String
    let productId: String?
    let signedTransactionJWS: String?
    let transactionId: String?
    let originalTransactionId: String?
    let subscription: CapitolLedgerSubscriptionSnapshot?
}

extension ISO8601DateFormatter {
    static let capitolLedger: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
