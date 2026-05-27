import { describe, expect, it } from "vitest";
import {
  calculateMortgage,
  estimateMaxAffordableHomePrice,
} from "./financialPlanning.services";

describe("financialPlanning.services (financial planning tools)", () => {
  it("calculates monthly mortgage breakdown with interest and recurring costs", () => {
    const result = calculateMortgage({
      homePrice: 5000000,
      downPayment: 1000000,
      annualInterestRate: 10,
      termYears: 30,
      propertyTaxAnnual: 30000,
      insuranceAnnual: 12000,
      hoaMonthly: 5000,
    });

    expect(result.loanAmount).toBe(4000000);
    expect(result.principalAndInterestMonthly).toBeGreaterThan(30000);
    expect(result.propertyTaxMonthly).toBe(2500);
    expect(result.insuranceMonthly).toBe(1000);
    expect(result.hoaMonthly).toBe(5000);
    expect(result.totalMonthlyPayment).toBeGreaterThan(result.principalAndInterestMonthly);
  });

  it("handles zero-interest loan by distributing principal evenly", () => {
    const result = calculateMortgage({
      homePrice: 2400000,
      downPayment: 0,
      annualInterestRate: 0,
      termYears: 20,
    });

    expect(result.loanAmount).toBe(2400000);
    expect(result.principalAndInterestMonthly).toBe(10000);
    expect(result.totalMonthlyPayment).toBe(10000);
  });

  it("estimates max affordable home price from income and debt ratio budget", () => {
    const result = estimateMaxAffordableHomePrice({
      monthlyIncome: 200000,
      debtRatioLimitPercent: 35,
      annualInterestRate: 9,
      termYears: 25,
      downPayment: 1200000,
      propertyTaxAnnual: 24000,
      insuranceAnnual: 12000,
      hoaMonthly: 3000,
    });

    expect(result.maxHousingBudget).toBe(70000);
    expect(result.maxPrincipalAndInterest).toBe(64000);
    expect(result.maxLoanAmount).toBeGreaterThan(0);
    expect(result.maxAffordableHomePrice).toBeGreaterThan(result.maxLoanAmount);
  });
});
