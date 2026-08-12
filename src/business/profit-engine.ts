/**
 * Pure profit/margin calculator. Takes explicit inputs only — never fetches
 * data itself. Every fee/cost must be supplied by the caller (from real
 * integration data once connected, or entered manually). No hard-coded
 * marketplace fee percentages, since those vary and change over time.
 */

export interface ProfitInputs {
  sellingPrice: number;
  productCost: number;
  shippingCost?: number;
  platformFees?: number; // e.g. Amazon referral + fulfillment fees, supplied by caller
  advertisingCost?: number;
  otherCosts?: number;
  quantitySold?: number; // defaults to 1
}

export interface ProfitResult {
  unitsSold: number;
  revenue: number;
  totalCosts: number;
  grossProfit: number;
  marginPercent: number; // grossProfit / revenue * 100
  roiPercent: number | null; // grossProfit / totalCosts * 100, null if totalCosts is 0
  breakdown: {
    productCost: number;
    shippingCost: number;
    platformFees: number;
    advertisingCost: number;
    otherCosts: number;
  };
}

export function calculateProfit(inputs: ProfitInputs): ProfitResult {
  const units = inputs.quantitySold ?? 1;
  const revenue = inputs.sellingPrice * units;

  const breakdown = {
    productCost: (inputs.productCost ?? 0) * units,
    shippingCost: (inputs.shippingCost ?? 0) * units,
    platformFees: inputs.platformFees ?? 0,
    advertisingCost: inputs.advertisingCost ?? 0,
    otherCosts: inputs.otherCosts ?? 0,
  };

  const totalCosts =
    breakdown.productCost +
    breakdown.shippingCost +
    breakdown.platformFees +
    breakdown.advertisingCost +
    breakdown.otherCosts;

  const grossProfit = revenue - totalCosts;
  const marginPercent = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;
  const roiPercent = totalCosts !== 0 ? (grossProfit / totalCosts) * 100 : null;

  return {
    unitsSold: units,
    revenue,
    totalCosts,
    grossProfit,
    marginPercent,
    roiPercent,
    breakdown,
  };
}

/** Minimum price to break even given known costs (excludes advertising, which is variable). */
export function breakEvenPrice(inputs: Omit<ProfitInputs, "sellingPrice" | "quantitySold">): number {
  return (
    (inputs.productCost ?? 0) +
    (inputs.shippingCost ?? 0) +
    (inputs.platformFees ?? 0) +
    (inputs.otherCosts ?? 0)
  );
                               }
