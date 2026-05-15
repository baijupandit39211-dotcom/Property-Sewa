"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
    { label: "Principal & Interest", value: principalAndInterest, color: "#24472E" },
    { label: "Property Tax", value: propertyTaxMonthly, color: "#13EC80" },
    { label: "Home Insurance", value: insuranceMonthly, color: "#4D9966" },
    { label: "HOA Fees", value: hoaMonthly, color: "#9EBAA6" },
  ];

  const total = values.reduce((s, x) => s + x.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <motion.div
      key={`${principalAndInterest}-${propertyTaxMonthly}-${insuranceMonthly}-${hoaMonthly}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center"
    >
      <svg viewBox="0 0 220 220" className="h-[250px] w-[250px] -rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="#E8F2EB"
          strokeWidth="34"
        />
        {values.map((item) => {
          const fraction = total > 0 ? item.value / total : 0;
          const strokeDasharray = `${fraction * circumference} ${circumference}`;
          const circle = (
            <motion.circle
              key={item.label}
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="34"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-offset}
              initial={{ pathLength: 0, opacity: 0.8 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          );
          offset += fraction * circumference;
          return circle;
        })}
        <circle cx="110" cy="110" r="46" fill="#F7FCFA" />
      </svg>
    </motion.div>
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
      <div className="flex h-[320px] items-center justify-center text-base text-[#618975]">
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
  const pathLength = points.reduce((total, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return total + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  return (
    <motion.svg
      key={`${rows.length}-${rows[rows.length - 1]?.remainingBalance ?? 0}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[320px] w-full"
    >
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
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            <text
              x={10}
              y={y + 4}
              fontSize="13"
              fill="#618975"
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
            fill="#618975"
          >
            {rows[index]?.period.replace("Year ", "").replace("Month ", "")}
          </text>
        );
      })}

      <motion.polygon
        points={areaPath}
        fill="rgba(49,98,73,0.16)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      />
      <motion.polyline
        points={linePath}
        fill="none"
        stroke="#316249"
        strokeWidth="4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ strokeDasharray: pathLength || 1 }}
      />
    </motion.svg>
  );
}

export default function MortgageCalculatorPage() {
  const [form, setForm] = useState<CalcInputs>(DEFAULTS);
  const [applied, setApplied] = useState<CalcInputs>(DEFAULTS);
  const [scheduleMode, setScheduleMode] = useState<"monthly" | "yearly">("monthly");
  const [tablePage, setTablePage] = useState(1);

  const calc = useMemo(() => calcMortgage(applied), [applied]);
  const monthlySchedule = useMemo(() => buildMonthlySchedule(applied), [applied]);
  const yearlySchedule = useMemo(
    () => buildYearlySchedule(monthlySchedule),
    [monthlySchedule]
  );

  const displayRows = scheduleMode === "monthly" ? monthlySchedule : yearlySchedule;
  const rowsPerPage = 5;
  const totalTablePages = Math.max(1, Math.ceil(displayRows.length / rowsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const tableStart = (safeTablePage - 1) * rowsPerPage;
  const tableRows = displayRows.slice(tableStart, tableStart + rowsPerPage);
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
    setTablePage(1);
  };

  const handleReset = () => {
    setForm(DEFAULTS);
    setApplied(DEFAULTS);
    setScheduleMode("monthly");
    setTablePage(1);
  };

  const sliderValue =
    toNum(form.price) > 0
      ? Math.min(100, Math.max(0, (toNum(form.downPayment) / toNum(form.price)) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-[#F7FCFA] px-4 py-8 text-sm text-[#618975] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1220px]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 overflow-hidden rounded-[32px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7"
        >
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
              <Calculator className="h-3.5 w-3.5 text-[#13EC80]" />
              Buyer Finance
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Mortgage Calculator
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              Calculate your monthly mortgage payments.
            </p>
          </div>
        </motion.section>

        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="border-[#E5E7EB] lg:border-r lg:pr-6">
                <h2 className="text-lg font-bold text-[#0D1C12]">
                  Mortgage Details
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      Home Price
                    </label>
                    <div className="relative">
                      <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                      <input
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      Down Payment
                    </label>
                    <div className="grid grid-cols-[1fr_86px] gap-2">
                      <div className="relative">
                        <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                        <input
                          value={form.downPayment}
                          onChange={(e) => update("downPayment", e.target.value)}
                          className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                        />
                      </div>
                      <div className="flex h-11 items-center justify-center rounded-lg border border-[#D1D5DB] bg-[#EEF8EB] text-sm font-bold text-[#618975]">
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
                      className="h-2 w-full cursor-pointer accent-[#316249]"
                    />
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      Loan Term
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                      <select
                        value={form.years}
                        onChange={(e) => update("years", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                      >
                        {[10, 15, 20, 25, 30].map((y) => (
                          <option key={y} value={y}>
                            {y} Years
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      Interest Rate
                    </label>
                    <div className="relative">
                      <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                      <input
                        value={form.rate}
                        onChange={(e) => update("rate", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      Property Tax
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                      <input
                        value={form.propertyTaxAnnual}
                        onChange={(e) => update("propertyTaxAnnual", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      Home Insurance
                    </label>
                    <div className="relative">
                      <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                      <input
                        value={form.insuranceAnnual}
                        onChange={(e) => update("insuranceAnnual", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:grid-cols-[1fr_220px]">
                    <label className="text-sm font-semibold text-[#618975]">
                      HOA Fees (Monthly)
                    </label>
                    <div className="relative">
                      <Calculator className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                      <input
                        value={form.hoaMonthly}
                        onChange={(e) => update("hoaMonthly", e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-right text-sm font-semibold text-[#0D1C12] outline-none focus:ring-2 focus:ring-[#316249]/15"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleCalculate}
                      className="h-12 rounded-lg bg-gradient-to-r from-[#316249] to-[#4D9966] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:from-[#28513D] hover:to-[#316249]"
                    >
                      Calculate
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#D1D5DB] bg-[#EEF8EB] text-sm font-semibold text-[#618975] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E8F2EB]"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:pl-2">
                <h2 className="text-lg font-bold text-[#0D1C12]">
                  Estimated Monthly Payment
                </h2>

                <div className="mt-5 border-t border-[#E5E7EB] pt-4">
                  <motion.div
                    key={calc.totalMonthly}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-center text-4xl font-bold leading-none text-[#0D1C12] sm:text-5xl"
                  >
                    {money(calc.totalMonthly)}
                    <span className="text-base font-medium text-[#618975] sm:text-lg">
                      {" "}
                      / month
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="mt-2 flex justify-center"
                  >
                    <DonutChart
                      principalAndInterest={calc.principalAndInterest}
                      propertyTaxMonthly={calc.propertyTaxMonthly}
                      insuranceMonthly={calc.insuranceMonthly}
                      hoaMonthly={calc.hoaMonthly}
                    />
                  </motion.div>

                  <div className="mt-3 space-y-3 text-sm">
                    {[
                      {
                        label: "Principal & Interest",
                        value: calc.principalAndInterest,
                        color: "bg-[#24472E]",
                      },
                      {
                        label: "Property Tax",
                        value: calc.propertyTaxMonthly,
                        color: "bg-[#13EC80]",
                      },
                      {
                        label: "Home Insurance",
                        value: calc.insuranceMonthly,
                        color: "bg-[#4D9966]",
                      },
                      {
                        label: "HOA Fees",
                        value: calc.hoaMonthly,
                        color: "bg-[#9EBAA6]",
                      },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: 0.06 * idx }}
                        className="flex items-center justify-between border-t border-[#E5E7EB] pt-3"
                      >
                        <div className="flex items-center gap-3 text-[#618975]">
                          <span className={`h-5 w-5 rounded ${item.color}`} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div className="font-semibold text-[#0D1C12]">
                          {money(item.value)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-bold text-[#0D1C12]">
              Payment Breakdown
            </h2>

            <div className="mt-5 max-w-[620px] space-y-0 text-sm">
              {[
                ["Principal & Interest", calc.principalAndInterest],
                ["Property Tax", calc.propertyTaxMonthly],
                ["Home Insurance", calc.insuranceMonthly],
                ["HOA Fees", calc.hoaMonthly],
                ["PMI (Private Mortgage Insurance)", 0],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-t border-[#E5E7EB] py-3"
                >
                  <span className="text-[#618975]">{label}</span>
                  <span className="font-semibold text-[#0D1C12]">
                    {money(Number(value))}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-[#E5E7EB] py-3 text-base">
                <span className="font-semibold text-[#0D1C12]">Total Monthly Payment</span>
                <span className="font-bold text-[#0D1C12]">
                  {money(calc.totalMonthly)}
                </span>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#0D1C12]">
                  Amortization Schedule
                </h2>
                <div className="inline-flex overflow-hidden rounded-lg border border-[#D1D5DB]">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("monthly");
                      setTablePage(1);
                    }}
                    className={`px-4 py-2 text-sm font-bold ${
                      scheduleMode === "monthly"
                        ? "bg-[#EEF8EB] text-[#0D1C12]"
                        : "bg-white text-[#618975]"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("yearly");
                      setTablePage(1);
                    }}
                    className={`px-4 py-2 text-sm font-bold ${
                      scheduleMode === "yearly"
                        ? "bg-[#EEF8EB] text-[#0D1C12]"
                        : "bg-white text-[#618975]"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-[#E5E7EB] pt-5">
              <div className="mb-4 text-base font-bold text-[#618975]">
                Remaining Loan Balance
              </div>

              <div className="overflow-x-auto">
                <motion.div
                  key={scheduleMode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                  className="min-w-[860px]"
                >
                  <div className="mb-3 flex items-center justify-end gap-6 text-sm font-semibold text-[#618975]">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded bg-[#316249]" />
                      Principal
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded bg-[#13EC80]" />
                      Interest
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded bg-[#CFE8D6]" />
                      HOA
                    </div>
                  </div>

                  <BalanceChart rows={chartRows} maxY={maxY} />
                </motion.div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-[#E5E7EB]">
                <div className="grid grid-cols-4 bg-[#EEF8EB] px-4 py-3 text-base font-bold text-[#618975]">
                  <div>{scheduleMode === "monthly" ? "Month" : "Year"}</div>
                  <div className="text-right">Principal Paid</div>
                  <div className="text-right">Interest Paid</div>
                  <div className="text-right">Remaining Balance</div>
                </div>

                {tableRows.map((row, idx) => (
                  <div
                    key={`${row.period}-${idx}`}
                    className="grid grid-cols-4 border-t border-[#E5E7EB] px-4 py-3 text-sm"
                  >
                    <div className="font-semibold text-[#0D1C12]">
                      {row.period.replace("Month ", "").replace("Year ", "")}
                    </div>
                    <div className="text-right font-semibold text-[#0D1C12]">
                      {money(row.principalPaid)}
                    </div>
                    <div className="text-right font-semibold text-[#0D1C12]">
                      {money(row.interestPaid)}
                    </div>
                    <div className="text-right font-semibold text-[#0D1C12]">
                      {money(row.remainingBalance)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#618975]">
                  Showing {displayRows.length === 0 ? 0 : tableStart + 1}-
                  {Math.min(tableStart + rowsPerPage, displayRows.length)} of {displayRows.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={safeTablePage <= 1}
                    className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-semibold text-[#0D1C12] transition hover:bg-[#EEF8EB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="rounded-lg border border-[#D1D5DB] bg-[#EEF8EB] px-3 py-2 text-sm font-semibold text-[#0D1C12]">
                    Page {safeTablePage} of {totalTablePages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                    disabled={safeTablePage >= totalTablePages}
                    className="inline-flex items-center justify-center rounded-lg bg-[#316249] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#28513D] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-[#618975]">
                Estimated values based on your input assumptions. This is not a lender quote.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
