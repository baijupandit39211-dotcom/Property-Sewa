"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  Home,
  Landmark,
  Percent,
  CalendarDays,
  Shield,
  Building2,
  RefreshCcw,
} from "lucide-react";

type CalcInputs = {
  price: string;
  downPayment: string;
  years: string;
  rate: string;
  propertyTaxAnnual: string;
  insuranceAnnual: string;
  hoaMonthly: string;
};

type ScheduleRow = {
  period: string;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
};

const DEFAULTS: CalcInputs = {
  price: "5000000",
  downPayment: "1000000",
  years: "30",
  rate: "10",
  propertyTaxAnnual: "30000",
  insuranceAnnual: "12000",
  hoaMonthly: "5000",
};

function money(v: number) {
  return `Rs ${Math.round(v).toLocaleString("en-IN")}`;
}

function toNum(v: string) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function calcMortgage(inputs: CalcInputs) {
  const homePrice = Math.max(0, toNum(inputs.price));
  const downPayment = Math.max(0, toNum(inputs.downPayment));
  const loanAmount = Math.max(0, homePrice - downPayment);
  const annualRate = Math.max(0, toNum(inputs.rate));
  const years = Math.max(0, toNum(inputs.years));
  const totalMonths = years * 12;
  const monthlyRate = annualRate / 100 / 12;

  let principalAndInterest = 0;

  if (loanAmount > 0 && monthlyRate > 0 && totalMonths > 0) {
    principalAndInterest =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
  } else if (loanAmount > 0 && totalMonths > 0) {
    principalAndInterest = loanAmount / totalMonths;
  }

  const propertyTaxMonthly = Math.max(0, toNum(inputs.propertyTaxAnnual)) / 12;
  const insuranceMonthly = Math.max(0, toNum(inputs.insuranceAnnual)) / 12;
  const hoaMonthly = Math.max(0, toNum(inputs.hoaMonthly));

  const totalMonthly =
    principalAndInterest + propertyTaxMonthly + insuranceMonthly + hoaMonthly;

  return {
    homePrice,
    downPayment,
    loanAmount,
    annualRate,
    years,
    totalMonths,
    monthlyRate,
    principalAndInterest,
    propertyTaxMonthly,
    insuranceMonthly,
    hoaMonthly,
    totalMonthly,
  };
}

function buildMonthlySchedule(inputs: CalcInputs): ScheduleRow[] {
  const {
    loanAmount,
    monthlyRate,
    totalMonths,
    principalAndInterest,
  } = calcMortgage(inputs);

  if (!loanAmount || !totalMonths) return [];

  let balance = loanAmount;
  const rows: ScheduleRow[] = [];

  for (let month = 1; month <= totalMonths; month++) {
    const interestPaid = monthlyRate > 0 ? balance * monthlyRate : 0;
    let principalPaid = principalAndInterest - interestPaid;

    if (principalPaid > balance) principalPaid = balance;
    if (principalPaid < 0) principalPaid = 0;

    balance = Math.max(0, balance - principalPaid);

    rows.push({
      period: `Month ${month}`,
      principalPaid,
      interestPaid,
      remainingBalance: balance,
    });

    if (balance <= 0) break;
  }

  return rows;
}

function buildYearlySchedule(monthlyRows: ScheduleRow[]): ScheduleRow[] {
  if (!monthlyRows.length) return [];

  const yearly: ScheduleRow[] = [];
  let year = 1;

  for (let i = 0; i < monthlyRows.length; i += 12) {
    const chunk = monthlyRows.slice(i, i + 12);
    yearly.push({
      period: `Year ${year}`,
      principalPaid: chunk.reduce((s, r) => s + r.principalPaid, 0),
      interestPaid: chunk.reduce((s, r) => s + r.interestPaid, 0),
      remainingBalance: chunk[chunk.length - 1]?.remainingBalance ?? 0,
    });
    year += 1;
  }

  return yearly;
}

function DonutChart({
  principalAndInterest,
  propertyTaxMonthly,
  insuranceMonthly,
  hoaMonthly,
}: {
  principalAndInterest: number;
  propertyTaxMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
}) {
  const values = [
    { label: "Principal & Interest", value: principalAndInterest, color: "#2563eb" },
    { label: "Property Tax", value: propertyTaxMonthly, color: "#16a34a" },
    { label: "Home Insurance", value: insuranceMonthly, color: "#f97316" },
    { label: "HOA Fees", value: hoaMonthly, color: "#f59e0b" },
  ];

  const total = values.reduce((s, x) => s + x.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 220" className="h-[250px] w-[250px] -rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="34"
        />
        {values.map((item) => {
          const fraction = total > 0 ? item.value / total : 0;
          const strokeDasharray = `${fraction * circumference} ${circumference}`;
          const circle = (
            <circle
              key={item.label}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="34"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-offset}
            />
          );
          offset += fraction * circumference;
          return circle;
        })}
        <circle cx="110" cy="110" r="46" fill="white" />
      </svg>
    </div>
  );
}

function BalanceChart({
  rows,
  maxY,
}: {
  rows: ScheduleRow[];
  maxY: number;
}) {
  if (!rows.length || maxY <= 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-base text-slate-500">
        No amortization data yet
      </div>
    );
  }

  const width = 960;
  const height = 320;
  const leftPad = 70;
  const rightPad = 20;
  const topPad = 20;
  const bottomPad = 50;
  const innerW = width - leftPad - rightPad;
  const innerH = height - topPad - bottomPad;

  const points = rows.map((row, i) => {
    const x =
      leftPad + (rows.length === 1 ? 0 : (i / (rows.length - 1)) * innerW);
    const y = topPad + (1 - row.remainingBalance / maxY) * innerH;
    return { x, y };
  });

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `${leftPad},${topPad + innerH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${leftPad + innerW},${topPad + innerH}`,
  ].join(" ");

  const yTicks = 4;
  const xTicks = Math.min(6, rows.length);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
      {[...Array(yTicks + 1)].map((_, i) => {
        const y = topPad + (i / yTicks) * innerH;
        const value = Math.round(maxY - (i / yTicks) * maxY);
        return (
          <g key={i}>
            <line
              x1={leftPad}
              y1={y}
              x2={leftPad + innerW}
              y2={y}
              stroke="#d7dfeb"
              strokeWidth="1"
            />
            <text
              x={10}
              y={y + 4}
              fontSize="13"
              fill="#475569"
            >
              {value >= 100000 ? `Rs ${(value / 100000).toFixed(0)}L` : money(value)}
            </text>
          </g>
        );
      })}

      {[...Array(xTicks)].map((_, i) => {
        const index =
          xTicks === 1 ? 0 : Math.round((i / (xTicks - 1)) * (rows.length - 1));
        const x =
          leftPad + (rows.length === 1 ? 0 : (index / (rows.length - 1)) * innerW);
        return (
          <text
            key={i}
            x={x}
            y={height - 12}
            textAnchor="middle"
            fontSize="13"
            fill="#475569"
          >
            {rows[index]?.period.replace("Year ", "").replace("Month ", "")}
          </text>
        );
      })}

      <polygon points={areaPath} fill="rgba(37,99,235,0.18)" />
      <polyline
        points={linePath}
        fill="none"
        stroke="#2563eb"
        strokeWidth="4"
      />
    </svg>
  );
}

export default function MortgageCalculatorPage() {
  const [form, setForm] = useState<CalcInputs>(DEFAULTS);
  const [applied, setApplied] = useState<CalcInputs>(DEFAULTS);
  const [scheduleMode, setScheduleMode] = useState<"monthly" | "yearly">("monthly");

  const calc = useMemo(() => calcMortgage(applied), [applied]);
  const monthlySchedule = useMemo(() => buildMonthlySchedule(applied), [applied]);
  const yearlySchedule = useMemo(
    () => buildYearlySchedule(monthlySchedule),
    [monthlySchedule]
  );

  const displayRows = scheduleMode === "monthly" ? monthlySchedule : yearlySchedule;
  const tableRows = displayRows.slice(0, scheduleMode === "monthly" ? 12 : 10);
  const chartRows =
    scheduleMode === "monthly"
      ? buildYearlySchedule(monthlySchedule)
      : yearlySchedule;

  const maxY = Math.max(calc.loanAmount, 1);

  const downPercent =
    toNum(form.price) > 0
      ? (toNum(form.downPayment) / toNum(form.price)) * 100
      : 0;

  const update = (key: keyof CalcInputs, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = () => {
    setApplied(form);
  };

  const handleReset = () => {
    setForm(DEFAULTS);
    setApplied(DEFAULTS);
    setScheduleMode("monthly");
  };

  const sliderValue =
    toNum(form.price) > 0
      ? Math.min(100, Math.max(0, (toNum(form.downPayment) / toNum(form.price)) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-[#eef3f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Mortgage Calculator
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Calculate your monthly mortgage payments.
          </p>
        </div>

        <div className="space-y-5">
          <section className="rounded-[22px] border border-[#d7e0ea] bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="border-[#d7e0ea] lg:border-r lg:pr-6">
                <h2 className="text-[20px] font-bold text-slate-800">
                  Mortgage Details
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      Home Price
                    </label>
                    <div className="relative">
                      <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      Down Payment
                    </label>
                    <div className="grid grid-cols-[1fr_86px] gap-2">
                      <div className="relative">
                        <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          value={form.downPayment}
                          onChange={(e) => update("downPayment", e.target.value)}
                          className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div className="flex h-11 items-center justify-center rounded-lg border border-[#cdd7e3] bg-slate-50 text-sm font-bold text-slate-600">
                        {isFinite(downPercent) ? `${Math.round(downPercent)}%` : "0%"}
                      </div>
                    </div>
                  </div>

                  <div className="px-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={sliderValue}
                      onChange={(e) => {
                        const pct = Number(e.target.value);
                        const next = Math.round((toNum(form.price) * pct) / 100);
                        update("downPayment", String(next));
                      }}
                      className="h-2 w-full cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      Loan Term
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <select
                        value={form.years}
                        onChange={(e) => update("years", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {[10, 15, 20, 25, 30].map((y) => (
                          <option key={y} value={y}>
                            {y} Years
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      Interest Rate
                    </label>
                    <div className="relative">
                      <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={form.rate}
                        onChange={(e) => update("rate", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      Property Tax
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={form.propertyTaxAnnual}
                        onChange={(e) => update("propertyTaxAnnual", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      Home Insurance
                    </label>
                    <div className="relative">
                      <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={form.insuranceAnnual}
                        onChange={(e) => update("insuranceAnnual", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#d7e0ea] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-[17px] font-semibold text-slate-700">
                      HOA Fees (Monthly)
                    </label>
                    <div className="relative">
                      <Calculator className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={form.hoaMonthly}
                        onChange={(e) => update("hoaMonthly", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#cdd7e3] bg-white pl-9 pr-3 text-right text-[17px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleCalculate}
                      className="h-12 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-lg font-bold text-white hover:from-blue-700 hover:to-blue-600"
                    >
                      Calculate
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#cdd7e3] bg-slate-50 text-lg font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:pl-2">
                <h2 className="text-[20px] font-bold text-slate-800">
                  Estimated Monthly Payment
                </h2>

                <div className="mt-5 border-t border-[#d7e0ea] pt-4">
                  <div className="text-center text-[54px] font-extrabold leading-none text-slate-900">
                    {money(calc.totalMonthly)}
                    <span className="text-[22px] font-medium text-slate-700">
                      {" "}
                      / month
                    </span>
                  </div>

                  <div className="mt-2 flex justify-center">
                    <DonutChart
                      principalAndInterest={calc.principalAndInterest}
                      propertyTaxMonthly={calc.propertyTaxMonthly}
                      insuranceMonthly={calc.insuranceMonthly}
                      hoaMonthly={calc.hoaMonthly}
                    />
                  </div>

                  <div className="mt-3 space-y-3 text-[18px]">
                    {[
                      {
                        label: "Principal & Interest",
                        value: calc.principalAndInterest,
                        color: "bg-blue-600",
                      },
                      {
                        label: "Property Tax",
                        value: calc.propertyTaxMonthly,
                        color: "bg-emerald-600",
                      },
                      {
                        label: "Home Insurance",
                        value: calc.insuranceMonthly,
                        color: "bg-orange-500",
                      },
                      {
                        label: "HOA Fees",
                        value: calc.hoaMonthly,
                        color: "bg-amber-500",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between border-t border-[#d7e0ea] pt-3"
                      >
                        <div className="flex items-center gap-3 text-slate-700">
                          <span className={`h-5 w-5 rounded ${item.color}`} />
                          <span>{item.label}</span>
                        </div>
                        <div className="font-extrabold text-slate-900">
                          {money(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#d7e0ea] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[20px] font-bold text-slate-800">
              Payment Breakdown
            </h2>

            <div className="mt-5 max-w-[620px] space-y-0 text-[18px]">
              {[
                ["Principal & Interest", calc.principalAndInterest],
                ["Property Tax", calc.propertyTaxMonthly],
                ["Home Insurance", calc.insuranceMonthly],
                ["HOA Fees", calc.hoaMonthly],
                ["PMI (Private Mortgage Insurance)", 0],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-t border-[#d7e0ea] py-3"
                >
                  <span className="text-slate-700">{label}</span>
                  <span className="font-extrabold text-slate-900">
                    {money(Number(value))}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-[#d7e0ea] py-3 text-[20px]">
                <span className="font-bold text-slate-800">Total Monthly Payment</span>
                <span className="font-extrabold text-slate-900">
                  {money(calc.totalMonthly)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#d7e0ea] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-[20px] font-bold text-slate-800">
                  Amortization Schedule
                </h2>
                <div className="inline-flex overflow-hidden rounded-lg border border-[#cdd7e3]">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("monthly")}
                    className={`px-4 py-2 text-sm font-bold ${
                      scheduleMode === "monthly"
                        ? "bg-slate-200 text-slate-900"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("yearly")}
                    className={`px-4 py-2 text-sm font-bold ${
                      scheduleMode === "yearly"
                        ? "bg-slate-200 text-slate-900"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-[#d7e0ea] pt-5">
              <div className="mb-4 text-[18px] font-bold text-slate-700">
                Remaining Loan Balance
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="mb-3 flex items-center justify-end gap-6 text-sm font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded bg-blue-600" />
                      Principal
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded bg-emerald-500" />
                      Interest
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded bg-amber-500" />
                      HOA
                    </div>
                  </div>

                  <BalanceChart rows={chartRows} maxY={maxY} />
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-[#d7e0ea]">
                <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-base font-bold text-slate-700">
                  <div>{scheduleMode === "monthly" ? "Month" : "Year"}</div>
                  <div className="text-right">Principal Paid</div>
                  <div className="text-right">Interest Paid</div>
                  <div className="text-right">Remaining Balance</div>
                </div>

                {tableRows.map((row, idx) => (
                  <div
                    key={`${row.period}-${idx}`}
                    className="grid grid-cols-4 border-t border-[#d7e0ea] px-4 py-3 text-[17px]"
                  >
                    <div className="font-semibold text-slate-700">
                      {row.period.replace("Month ", "").replace("Year ", "")}
                    </div>
                    <div className="text-right font-semibold text-slate-900">
                      {money(row.principalPaid)}
                    </div>
                    <div className="text-right font-semibold text-slate-900">
                      {money(row.interestPaid)}
                    </div>
                    <div className="text-right font-extrabold text-slate-900">
                      {money(row.remainingBalance)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}