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
    static let proMonthly = "com.capitolwonk.pro.monthly"
    static let proAnnual = "com.capitolwonk.pro.annual"
    static let teamMonthly = "com.capitolwonk.team.monthly"
    static let teamAnnual = "com.capitolwonk.team.annual"
    static let productIds: Set<String> = [proMonthly, proAnnual, teamMonthly, teamAnnual]

    static func cycle(for productId: String) -> CapitolLedgerCycle? {
        switch productId {
        case proMonthly, teamMonthly:
            return .monthly
        case proAnnual, teamAnnual:
            return .annual
        default:
            return nil
        }
    }

    static func plan(for productId: String) -> CapitolLedgerPlan? {
        switch productId {
        case proMonthly, proAnnual:
            return .pro
        case teamMonthly, teamAnnual:
            return .team
        default:
            return nil
        }
    }

    static func seatCount(for productId: String) -> Int? {
        switch productId {
        case teamMonthly, teamAnnual:
            return 3
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
