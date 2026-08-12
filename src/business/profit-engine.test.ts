import test from "node:test";
import assert from "node:assert/strict";
import { calculateProfit, breakEvenPrice } from "./profit-engine";

test("calculateProfit: simple single-unit sale", () => {
  const result = calculateProfit({
    sellingPrice: 30,
    productCost: 10,
    shippingCost: 2,
    platformFees: 5,
  });
  assert.equal(result.revenue, 30);
  assert.equal(result.totalCosts, 17);
  assert.equal(result.grossProfit, 13);
  assert.ok(Math.abs(result.marginPercent - 43.333) < 0.01);
});

test("calculateProfit: multiple units scales per-unit costs, not flat fees", () => {
  const result = calculateProfit({
    sellingPrice: 20,
    productCost: 5,
    quantitySold: 3,
    platformFees: 6, // flat, not per-unit
  });
  assert.equal(result.revenue, 60);
  assert.equal(result.breakdown.productCost, 15);
  assert.equal(result.totalCosts, 21);
  assert.equal(result.grossProfit, 39);
});

test("calculateProfit: zero revenue does not divide by zero", () => {
  const result = calculateProfit({ sellingPrice: 0, productCost: 5 });
  assert.equal(result.marginPercent, 0);
});

test("breakEvenPrice: sums known costs, excludes advertising", () => {
  const price = breakEvenPrice({ productCost: 10, shippingCost: 2, platformFees: 3 });
  assert.equal(price, 15);
});
