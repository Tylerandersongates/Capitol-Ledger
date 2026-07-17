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
    let seatCount: Int?
}

enum CapitolLedgerProduct {
    static let minimumTeamSeatCount = 3
    static let maximumTeamSeatCount = 20
    static let maximumAnnualTeamSeatCount = 16
    static let proMonthly = "com.capitolwonk.pro.monthly"
    static let proAnnual = "com.capitolwonk.pro.annual"
    static let teamMonthly = "com.capitolwonk.team.monthly"
    static let teamAnnual = "com.capitolwonk.team.annual"
    static let productIds: Set<String> = {
        var identifiers: Set<String> = [proMonthly, proAnnual, teamMonthly, teamAnnual]
        for seatCount in (minimumTeamSeatCount + 1)...maximumTeamSeatCount {
            identifiers.insert(teamProductId(cycle: .monthly, seatCount: seatCount))
            if seatCount <= maximumAnnualTeamSeatCount {
                identifiers.insert(teamProductId(cycle: .annual, seatCount: seatCount))
            }
        }
        return identifiers
    }()

    static func teamProductId(cycle: CapitolLedgerCycle, seatCount: Int) -> String {
        if seatCount == minimumTeamSeatCount {
            return cycle == .annual ? teamAnnual : teamMonthly
        }
        return "com.capitolwonk.team.\(seatCount).\(cycle.rawValue)"
    }

    static func cycle(for productId: String) -> CapitolLedgerCycle? {
        switch productId {
        case proMonthly, teamMonthly:
            return .monthly
        case proAnnual, teamAnnual:
            return .annual
        default:
            guard seatCount(for: productId) != nil else { return nil }
            return productId.hasSuffix(".annual") ? .annual : productId.hasSuffix(".monthly") ? .monthly : nil
        }
    }

    static func plan(for productId: String) -> CapitolLedgerPlan? {
        switch productId {
        case proMonthly, proAnnual:
            return .pro
        case teamMonthly, teamAnnual:
            return .team
        default:
            return seatCount(for: productId) == nil ? nil : .team
        }
    }

    static func seatCount(for productId: String) -> Int? {
        if productId == teamMonthly || productId == teamAnnual { return minimumTeamSeatCount }

        let parts = productId.split(separator: ".")
        guard
            parts.count == 5,
            parts[0] == "com",
            parts[1] == "capitolwonk",
            parts[2] == "team",
            let seats = Int(parts[3]),
            parts[4] == "monthly" || parts[4] == "annual"
        else {
            return nil
        }

        let maximumSeats = parts[4] == "annual" ? maximumAnnualTeamSeatCount : maximumTeamSeatCount
        guard (minimumTeamSeatCount...maximumSeats).contains(seats) else { return nil }

        return seats
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
