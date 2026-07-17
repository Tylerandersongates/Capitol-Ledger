import type { BillingCycle } from "@/types/capitol";

export const minimumTeamSeatCount = 3;
export const maximumTeamSeatCount = 20;
export const maximumAnnualTeamSeatCount = 16;
export const teamMonthlySeatReferencePrice = "$5.99";
export const teamAnnualSeatReferencePrice = "$59.99";

const teamMonthlyPriceTierIncrementCents = 600;
const teamAnnualPriceTierIncrementCents = 6000;
const minimumTeamAppStoreProductIds: Record<BillingCycle, string> = {
  annual: "com.capitolwonk.team.annual",
  monthly: "com.capitolwonk.team.monthly"
};

export function normalizeTeamSeatCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return minimumTeamSeatCount;

  return Math.min(maximumTeamSeatCount, Math.max(minimumTeamSeatCount, Math.floor(parsed)));
}

export function isTeamSeatCountOverMaximum(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return false;

  return Math.floor(parsed) > maximumTeamSeatCount;
}

export function normalizeOptionalTeamSeatCount(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  return normalizeTeamSeatCount(value);
}

export function getMaximumTeamSeatCount(cycle: BillingCycle) {
  return cycle === "annual" ? maximumAnnualTeamSeatCount : maximumTeamSeatCount;
}

export function normalizeTeamSeatCountForCycle(value: unknown, cycle: BillingCycle) {
  return Math.min(getMaximumTeamSeatCount(cycle), normalizeTeamSeatCount(value));
}

export function getTeamSeatPriceCents(cycle: BillingCycle, seatCount: unknown) {
  const seats = normalizeTeamSeatCountForCycle(seatCount, cycle);
  const increment = cycle === "annual" ? teamAnnualPriceTierIncrementCents : teamMonthlyPriceTierIncrementCents;

  // Apple price tiers use clean .99 totals. This keeps the approved per-seat economics
  // while matching the exact App Store price shown for every supported seat product.
  return seats * increment - 1;
}

export function formatTeamSeatPrice(cycle: BillingCycle, seatCount: unknown) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency"
  }).format(getTeamSeatPriceCents(cycle, seatCount) / 100);
}

export function getTeamAppStoreProductId(cycle: BillingCycle, seatCount: unknown) {
  const seats = normalizeTeamSeatCountForCycle(seatCount, cycle);
  if (seats === minimumTeamSeatCount) return minimumTeamAppStoreProductIds[cycle];

  return `com.capitolwonk.team.${seats}.${cycle}`;
}

export function getTeamAppStoreProducts() {
  return Array.from({ length: maximumTeamSeatCount - minimumTeamSeatCount + 1 }, (_, index) => minimumTeamSeatCount + index).flatMap(
    (seatCount) =>
      (["monthly", "annual"] as const)
        .filter((cycle) => seatCount <= getMaximumTeamSeatCount(cycle))
        .map((cycle) => ({
          cycle,
          price: formatTeamSeatPrice(cycle, seatCount),
          productId: getTeamAppStoreProductId(cycle, seatCount),
          seatCount
        }))
  );
}
