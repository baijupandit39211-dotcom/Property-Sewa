export type MortgageInput = {
  homePrice: number;
  downPayment: number;
  annualInterestRate: number;
  termYears: number;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  hoaMonthly?: number;
};

export type MortgageBreakdown = {
  loanAmount: number;
  principalAndInterestMonthly: number;
  propertyTaxMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  totalMonthlyPayment: number;
};

function safeNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function calculateMortgage(input: MortgageInput): MortgageBreakdown {
  const homePrice = Math.max(0, safeNumber(input.homePrice));
  const downPayment = Math.max(0, safeNumber(input.downPayment));
  const annualRate = Math.max(0, safeNumber(input.annualInterestRate));
  const termYears = Math.max(0, safeNumber(input.termYears));
  const totalMonths = termYears * 12;

  const loanAmount = Math.max(0, homePrice - downPayment);
  const monthlyRate = annualRate / 100 / 12;

  let principalAndInterestMonthly = 0;
  if (loanAmount > 0 && totalMonths > 0 && monthlyRate > 0) {
    principalAndInterestMonthly =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
  } else if (loanAmount > 0 && totalMonths > 0) {
    principalAndInterestMonthly = loanAmount / totalMonths;
  }

  const propertyTaxMonthly = Math.max(0, safeNumber(input.propertyTaxAnnual)) / 12;
  const insuranceMonthly = Math.max(0, safeNumber(input.insuranceAnnual)) / 12;
  const hoaMonthly = Math.max(0, safeNumber(input.hoaMonthly));

  return {
    loanAmount,
    principalAndInterestMonthly,
    propertyTaxMonthly,
    insuranceMonthly,
    hoaMonthly,
    totalMonthlyPayment:
      principalAndInterestMonthly + propertyTaxMonthly + insuranceMonthly + hoaMonthly,
  };
}

export function estimateMaxAffordableHomePrice(params: {
  monthlyIncome: number;
  debtRatioLimitPercent?: number;
  annualInterestRate: number;
  termYears: number;
  downPayment: number;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  hoaMonthly?: number;
}) {
  const monthlyIncome = Math.max(0, safeNumber(params.monthlyIncome));
  const debtRatioLimitPercent = Math.max(1, safeNumber(params.debtRatioLimitPercent || 35));
  const maxHousingBudget = (monthlyIncome * debtRatioLimitPercent) / 100;

  const fixedCosts =
    Math.max(0, safeNumber(params.propertyTaxAnnual)) / 12 +
    Math.max(0, safeNumber(params.insuranceAnnual)) / 12 +
    Math.max(0, safeNumber(params.hoaMonthly));

  const maxPrincipalAndInterest = Math.max(0, maxHousingBudget - fixedCosts);

  const monthlyRate = Math.max(0, safeNumber(params.annualInterestRate)) / 100 / 12;
  const totalMonths = Math.max(0, safeNumber(params.termYears)) * 12;

  let maxLoanAmount = 0;
  if (maxPrincipalAndInterest > 0 && totalMonths > 0 && monthlyRate > 0) {
    maxLoanAmount =
      (maxPrincipalAndInterest * (Math.pow(1 + monthlyRate, totalMonths) - 1)) /
      (monthlyRate * Math.pow(1 + monthlyRate, totalMonths));
  } else if (maxPrincipalAndInterest > 0 && totalMonths > 0) {
    maxLoanAmount = maxPrincipalAndInterest * totalMonths;
  }

  const downPayment = Math.max(0, safeNumber(params.downPayment));
  return {
    maxLoanAmount,
    maxAffordableHomePrice: maxLoanAmount + downPayment,
    maxHousingBudget,
    maxPrincipalAndInterest,
  };
}
