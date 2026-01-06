"use client";

import { Calculator, DollarSign, Percent } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AmortizationRow {
	month: number;
	beginningBalance: number;
	payment: number;
	principalPaid: number;
	interestPaid: number;
	endingBalance: number;
}

export default function MortgageCalculatorPage() {
	// State for inputs
	const [price, setPrice] = useState<string>("500000");
	const [downPayment, setDownPayment] = useState<string>("100000");
	const [rate, setRate] = useState<string>("3.5");
	const [tenure, setTenure] = useState<string>("30");

	// State for results
	const [emi, setEmi] = useState<number>(0);
	const [totalInterest, setTotalInterest] = useState<number>(0);
	const [totalPayment, setTotalPayment] = useState<number>(0);
	const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
	const [isCalculated, setIsCalculated] = useState(false);
	const [showFullSchedule, setShowFullSchedule] = useState(false);

	const calculateMortgage = () => {
		const p = Number.parseFloat(price) || 0;
		const d = Number.parseFloat(downPayment) || 0;
		const r = Number.parseFloat(rate) || 0;
		const t = Number.parseFloat(tenure) || 0;

		if (p > 0 && r > 0 && t > 0) {
			const loanAmount = p - d;
			const monthlyRate = r / 12 / 100;
			const months = t * 12;

			if (loanAmount > 0) {
				// EMI Formula
				const emiValue =
					(loanAmount * monthlyRate * (1 + monthlyRate) ** months) /
					((1 + monthlyRate) ** months - 1);

				setEmi(Math.round(emiValue));
				const totalPay = emiValue * months;
				setTotalPayment(Math.round(totalPay));
				setTotalInterest(Math.round(totalPay - loanAmount));

				// Generate Amortization Schedule
				const newSchedule: AmortizationRow[] = [];
				let balance = loanAmount;
				for (let i = 1; i <= months; i++) {
					const interest = balance * monthlyRate;
					const principal = emiValue - interest;
					const endBalance = balance - principal;

					newSchedule.push({
						month: i,
						beginningBalance: balance,
						payment: emiValue,
						principalPaid: principal,
						interestPaid: interest,
						endingBalance: Math.max(0, endBalance),
					});
					balance = endBalance;
				}
				setSchedule(newSchedule);
				setIsCalculated(true);
			}
		}
	};

	// Initial calculation for demo look
	useEffect(() => {
		calculateMortgage();
	}, [calculateMortgage]);

	const handleReset = () => {
		setPrice("");
		setDownPayment("");
		setRate("");
		setTenure("");
		setIsCalculated(false);
		setSchedule([]);
	};

	const principalPercentage = isCalculated
		? Math.round(
				((Number.parseFloat(price) - Number.parseFloat(downPayment)) /
					totalPayment) *
					100,
			)
		: 0;
	const interestPercentage = 100 - principalPercentage;

	return (
		<div className="fade-in mx-auto max-w-7xl animate-in space-y-8 pb-12 duration-500">
			<div className="space-y-2">
				<h1 className="font-bold text-3xl text-[#0f251c]">
					Mortgage Calculator
				</h1>
				<p className="text-gray-500">
					Use this tool to estimate your monthly mortgage payments and
					understand the total cost of your loan effectively.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Left Column: Loan Details Input */}
				<Card className="h-fit border-gray-100 p-6 shadow-sm lg:col-span-5">
					<div className="mb-6 flex items-center gap-2 text-[#0f251c]">
						<Calculator className="h-5 w-5" />
						<h2 className="font-semibold text-lg">Loan Details</h2>
					</div>

					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="font-medium text-gray-600">
								Property Price
							</Label>
							<div className="relative">
								<DollarSign className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
								<Input
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									className="h-12 border-gray-200 bg-white pl-9 focus:border-[#316249] focus:ring-[#316249]"
								/>
							</div>
							<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
								<div className="h-full w-3/4 bg-[#316249]" />
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="col-span-2 space-y-2 sm:col-span-1">
								<Label className="font-medium text-gray-600">
									Down Payment
								</Label>
								<div className="relative">
									<DollarSign className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
									<Input
										value={downPayment}
										onChange={(e) => setDownPayment(e.target.value)}
										className="h-12 border-gray-200 bg-gray-50 pl-9"
									/>
								</div>
							</div>
							<div className="col-span-2 space-y-2 sm:col-span-1">
								<Label className="font-medium text-gray-600 opacity-0">
									Percent
								</Label>
								<div className="relative">
									<Input
										value="20"
										readOnly
										className="h-12 border-gray-200 bg-gray-50 pr-8 text-right text-gray-500"
									/>
									<Percent className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 text-gray-400" />
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="font-medium text-gray-600">
									Interest Rate
								</Label>
								<div className="relative">
									<Input
										value={rate}
										onChange={(e) => setRate(e.target.value)}
										className="h-12 border-gray-200 bg-gray-50"
									/>
									<Percent className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 text-gray-400" />
								</div>
							</div>
							<div className="space-y-2">
								<Label className="font-medium text-gray-600">Loan Tenure</Label>
								<div className="relative">
									<Input
										value={tenure}
										onChange={(e) => setTenure(e.target.value)}
										className="h-12 border-gray-200 bg-gray-50"
									/>
									<span className="-translate-y-1/2 absolute top-1/2 right-4 font-medium text-gray-400 text-sm">
										Years
									</span>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 pt-4">
							<Button
								onClick={calculateMortgage}
								className="h-12 bg-[#2a5c49] font-medium text-white shadow-md transition-all hover:bg-[#1d3d33] hover:shadow-lg"
							>
								Calculate
							</Button>
							<Button
								onClick={handleReset}
								variant="outline"
								className="h-12 border-gray-200 font-medium text-gray-700 hover:bg-gray-50"
							>
								Reset
							</Button>
						</div>
					</div>
				</Card>

				{/* Right Column: Visualization */}
				<div className="space-y-6 lg:col-span-7">
					{/* EMI Card */}
					<Card className="relative flex flex-col items-center justify-between gap-6 overflow-hidden border-gray-100 bg-white p-8 shadow-sm md:flex-row">
						<div className="w-full flex-1 space-y-6">
							<div>
								<p className="mb-2 font-bold text-gray-400 text-xs uppercase tracking-wider">
									Estimated EMI Per Month
								</p>
								<div className="flex items-baseline gap-2">
									<span className="font-bold text-5xl text-[#0f251c] tracking-tight">
										${emi.toLocaleString()}
									</span>
									<span className="font-medium text-gray-400 text-lg">
										/ mo
									</span>
								</div>
							</div>

							<div className="flex gap-12 border-gray-100 border-t pt-6">
								<div>
									<p className="mb-1 font-bold text-gray-400 text-xs uppercase tracking-wider">
										Total Interest
									</p>
									<p className="font-bold text-[#0f251c] text-xl">
										${totalInterest.toLocaleString()}
									</p>
								</div>
								<div>
									<p className="mb-1 font-bold text-gray-400 text-xs uppercase tracking-wider">
										Total Payment
									</p>
									<p className="font-bold text-[#0f251c] text-xl">
										${totalPayment.toLocaleString()}
									</p>
								</div>
							</div>
						</div>

						{/* Decorative Icon Circle */}
						<div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gray-50">
							<DollarSign className="h-8 w-8 text-gray-300" />
						</div>
					</Card>

					{/* Breakdown Card */}
					<Card className="border-gray-100 bg-white p-8 shadow-sm">
						<h3 className="mb-8 font-semibold text-[#0f251c] text-lg">
							Payment Breakdown
						</h3>

						<div className="flex flex-col items-center gap-12 md:flex-row">
							{/* Visual Chart - Upgraded to match screenshot track style */}
							<div className="flex h-48 w-full flex-1 items-end justify-center gap-8 rounded-xl bg-white p-6 md:w-auto">
								<div className="group relative flex h-full w-16 flex-col items-center justify-end gap-3">
									<div className="relative flex h-32 w-12 items-end overflow-hidden rounded-t-lg bg-[#e2e8f0]">
										<div
											className="w-full bg-[#416858] shadow-sm transition-all duration-1000"
											style={{ height: `${Math.max(principalPercentage, 5)}%` }}
										/>
									</div>
									<span className="font-semibold text-slate-500 text-xs">
										Principal
									</span>
								</div>
								<div className="group relative flex h-full w-16 flex-col items-center justify-end gap-3">
									<div className="relative flex h-32 w-12 items-end overflow-hidden rounded-t-lg bg-[#e2e8f0]">
										<div
											className="w-full bg-[#7ec5a2] shadow-sm transition-all duration-1000"
											style={{ height: `${Math.max(interestPercentage, 5)}%` }}
										/>
									</div>
									<span className="font-semibold text-slate-500 text-xs">
										Interest
									</span>
								</div>
							</div>

							{/* Legend */}
							<div className="min-w-[200px] space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-3 w-3 rounded-full bg-[#416858]" />
										<span className="font-medium text-gray-500">Principal</span>
									</div>
									<span className="font-bold text-[#0f251c]">
										{principalPercentage}%
									</span>
								</div>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-3 w-3 rounded-full bg-[#7ec5a2]" />
										<span className="font-medium text-gray-500">Interest</span>
									</div>
									<span className="font-bold text-[#0f251c]">
										{interestPercentage}%
									</span>
								</div>

								<div className="mt-4 border-gray-100 border-t pt-4 text-center">
									<p className="mb-1 text-gray-400 text-xs">
										Total Loan Value:
									</p>
									<p className="flex items-center justify-center gap-2 font-bold text-[#0f251c] text-lg">
										${totalPayment.toLocaleString()}
										<span className="rounded-full bg-[#13EC80]/10 px-2 py-0.5 font-normal text-[#13EC80] text-xs">
											+0% fees
										</span>
									</p>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>

			{/* Bottom Section: Schedule */}
			<Card className="overflow-hidden border-gray-100 bg-white shadow-sm">
				<div className="flex flex-col justify-between gap-4 border-gray-100 border-b p-6 sm:flex-row sm:items-center">
					<div>
						<h3 className="font-bold text-[#0f251c] text-lg">
							Detailed Payment Schedule
						</h3>
						<p className="mt-1 text-gray-500 text-sm">
							Monthly breakdown of beginning balance, payment allocation, and
							ending balance.
						</p>
					</div>
					<div className="flex items-center rounded-lg border border-gray-100 bg-gray-50 p-1">
						<button className="px-4 py-1.5 font-medium text-gray-500 text-sm transition-colors hover:text-[#0f251c]">
							Yearly View
						</button>
						<button className="rounded-md bg-[#2a5c49] px-4 py-1.5 font-medium text-sm text-white shadow-sm">
							Monthly View
						</button>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-gray-50/50 font-semibold text-gray-500 text-xs uppercase tracking-wider">
							<tr>
								<th className="px-6 py-4">Month</th>
								<th className="px-6 py-4">Beginning Balance</th>
								<th className="px-6 py-4">Scheduled Payment</th>
								<th className="px-6 py-4">Principal Paid</th>
								<th className="px-6 py-4">Interest Paid</th>
								<th className="px-6 py-4 text-right">Ending Balance</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{schedule
								.slice(0, showFullSchedule ? undefined : 5)
								.map((row) => (
									<tr
										key={row.month}
										className="transition-colors hover:bg-gray-50/50"
									>
										<td className="px-6 py-4 font-medium text-[#0f251c]">
											{row.month}
										</td>
										<td className="px-6 py-4 text-gray-600">
											$
											{row.beginningBalance.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-6 py-4 font-medium text-[#0f251c]">
											$
											{row.payment.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-6 py-4 font-medium text-[#2a5c49]">
											$
											{row.principalPaid.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-6 py-4 font-medium text-[#13EC80]">
											$
											{row.interestPaid.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-6 py-4 text-right font-bold text-[#0f251c]">
											$
											{row.endingBalance.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>

				{!showFullSchedule && (
					<div className="border-gray-100 border-t bg-gray-50/30 p-4 text-center">
						<Button
							variant="ghost"
							onClick={() => setShowFullSchedule(true)}
							className="font-medium text-[#2a5c49] hover:bg-transparent hover:underline"
						>
							Show full schedule
						</Button>
					</div>
				)}
			</Card>
		</div>
	);
}
