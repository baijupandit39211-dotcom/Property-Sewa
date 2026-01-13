"use client";

import { useMemo, useState } from "react";
import BuyerHeader from "../../../components/buyer/BuyerHeader";
import BuyerSidebar from "../../../components/buyer/BuyerSidebar";

export default function MortgageCalculatorPage() {
  const [price, setPrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");

  const parsed = useMemo(() => {
    const P = Math.max(0, Number(price || 0) - Number(downPayment || 0));
    const annual = Math.max(0, Number(rate || 0));
    const n = Math.max(0, Number(years || 0)) * 12;

    const r = annual / 100 / 12;
    if (!P || !r || !n) return { emi: 0, total: 0, interest: 0 };

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - P;

    return { emi, total, interest };
  }, [price, downPayment, rate, years]);

  const formatMoney = (v: number) =>
    v ? `$${Math.round(v).toLocaleString()}` : "$0";

  const reset = () => {
    setPrice("");
    setDownPayment("");
    setRate("");
    setYears("");
  };

  return (
    <div className="min-h-screen bg-emerald-50">
      <BuyerHeader />

      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
          <h1 className="text-3xl font-extrabold text-zinc-900">
            Mortgage Calculator
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Use this tool to estimate your monthly mortgage payments and
            understand the total cost of your loan.
          </p>

          <div className="mt-8 max-w-[520px] space-y-5">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Property Price"
              className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="Down Payment"
              className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Interest Rate"
              className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="Loan Tenure (Years)"
              className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />

            <button className="h-11 w-full rounded-xl bg-emerald-950 text-sm font-semibold text-white hover:bg-emerald-900">
              Calculate
            </button>
            <button
              onClick={reset}
              className="h-11 w-full rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-950 hover:bg-emerald-200"
            >
              Reset
            </button>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="border-t border-emerald-200 pt-4">
                <div className="text-xs text-emerald-700">
                  Total Interest Payable
                </div>
                <div className="text-sm font-semibold text-zinc-900">
                  {formatMoney(parsed.interest)}
                </div>
              </div>

              <div className="border-t border-emerald-200 pt-4">
                <div className="text-xs text-emerald-700">Total Payment</div>
                <div className="text-sm font-semibold text-zinc-900">
                  {formatMoney(parsed.total)}
                </div>
              </div>
            </div>

            <h2 className="pt-8 text-2xl font-bold text-zinc-900">Results</h2>

            <div className="rounded-2xl border border-emerald-200 bg-white p-6">
              <div className="text-xs text-zinc-600">EMI per month</div>
              <div className="mt-2 text-3xl font-extrabold text-zinc-900">
                {formatMoney(parsed.emi)}
              </div>
            </div>

            <div className="pt-6">
              <div className="text-sm font-semibold text-zinc-900">
                Payment Breakdown
              </div>
              <div className="mt-3 text-4xl font-extrabold text-zinc-900">
                {formatMoney(parsed.total)}
              </div>
              <div className="mt-2 text-sm text-emerald-700">Total +0%</div>

              <div className="mt-6 flex gap-8">
                <div className="h-28 w-12 rounded-xl bg-emerald-100" />
                <div className="h-28 w-12 rounded-xl bg-emerald-200" />
              </div>

              <div className="mt-3 flex gap-10 text-xs text-emerald-700">
                <div>Principal</div>
                <div>Interest</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
