"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { DollarSign, Percent, Calendar, RefreshCcw, Calculator } from "lucide-react"

interface AmortizationRow {
    month: number
    beginningBalance: number
    payment: number
    principalPaid: number
    interestPaid: number
    endingBalance: number
}

export default function MortgageCalculatorPage() {
    // State for inputs
    const [price, setPrice] = useState<string>("500000")
    const [downPayment, setDownPayment] = useState<string>("100000")
    const [rate, setRate] = useState<string>("3.5")
    const [tenure, setTenure] = useState<string>("30")

    // State for results
    const [emi, setEmi] = useState<number>(0)
    const [totalInterest, setTotalInterest] = useState<number>(0)
    const [totalPayment, setTotalPayment] = useState<number>(0)
    const [schedule, setSchedule] = useState<AmortizationRow[]>([])
    const [isCalculated, setIsCalculated] = useState(false)
    const [showFullSchedule, setShowFullSchedule] = useState(false)

    const calculateMortgage = () => {
        const p = parseFloat(price) || 0
        const d = parseFloat(downPayment) || 0
        const r = parseFloat(rate) || 0
        const t = parseFloat(tenure) || 0

        if (p > 0 && r > 0 && t > 0) {
            const loanAmount = p - d
            const monthlyRate = r / 12 / 100
            const months = t * 12

            if (loanAmount > 0) {
                // EMI Formula
                const emiValue =
                    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                    (Math.pow(1 + monthlyRate, months) - 1)

                setEmi(Math.round(emiValue))
                const totalPay = emiValue * months
                setTotalPayment(Math.round(totalPay))
                setTotalInterest(Math.round(totalPay - loanAmount))

                // Generate Amortization Schedule
                const newSchedule: AmortizationRow[] = []
                let balance = loanAmount
                for (let i = 1; i <= months; i++) {
                    const interest = balance * monthlyRate
                    const principal = emiValue - interest
                    const endBalance = balance - principal

                    newSchedule.push({
                        month: i,
                        beginningBalance: balance,
                        payment: emiValue,
                        principalPaid: principal,
                        interestPaid: interest,
                        endingBalance: Math.max(0, endBalance)
                    })
                    balance = endBalance
                }
                setSchedule(newSchedule)
                setIsCalculated(true)
            }
        }
    }

    // Initial calculation for demo look
    useEffect(() => {
        calculateMortgage()
    }, [])

    const handleReset = () => {
        setPrice("")
        setDownPayment("")
        setRate("")
        setTenure("")
        setIsCalculated(false)
        setSchedule([])
    }

    const principalPercentage = isCalculated ? Math.round(((parseFloat(price) - parseFloat(downPayment)) / totalPayment) * 100) : 0
    const interestPercentage = 100 - principalPercentage

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#0f251c]">Mortgage Calculator</h1>
                <p className="text-gray-500">
                    Use this tool to estimate your monthly mortgage payments and understand the total cost of your loan effectively.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Loan Details Input */}
                <Card className="lg:col-span-5 p-6 shadow-sm border-gray-100 h-fit">
                    <div className="flex items-center gap-2 mb-6 text-[#0f251c]">
                        <Calculator className="h-5 w-5" />
                        <h2 className="font-semibold text-lg">Loan Details</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Property Price</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="pl-9 h-12 bg-white border-gray-200 focus:border-[#316249] focus:ring-[#316249]"
                                />
                            </div>
                            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-[#316249] w-3/4"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1 space-y-2">
                                <Label className="text-gray-600 font-medium">Down Payment</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={downPayment}
                                        onChange={(e) => setDownPayment(e.target.value)}
                                        className="pl-9 h-12 bg-gray-50 border-gray-200"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1 space-y-2">
                                <Label className="text-gray-600 font-medium opacity-0">Percent</Label>
                                <div className="relative">
                                    <Input
                                        value="20"
                                        readOnly
                                        className="pr-8 h-12 bg-gray-50 border-gray-200 text-right text-gray-500"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-600 font-medium">Interest Rate</Label>
                                <div className="relative">
                                    <Input
                                        value={rate}
                                        onChange={(e) => setRate(e.target.value)}
                                        className="h-12 bg-gray-50 border-gray-200"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-600 font-medium">Loan Tenure</Label>
                                <div className="relative">
                                    <Input
                                        value={tenure}
                                        onChange={(e) => setTenure(e.target.value)}
                                        className="h-12 bg-gray-50 border-gray-200"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">Years</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button
                                onClick={calculateMortgage}
                                className="h-12 bg-[#2a5c49] hover:bg-[#1d3d33] text-white font-medium shadow-md hover:shadow-lg transition-all"
                            >
                                Calculate
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="h-12 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Right Column: Visualization */}
                <div className="lg:col-span-7 space-y-6">
                    {/* EMI Card */}
                    <Card className="p-8 shadow-sm border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden bg-white">
                        <div className="space-y-6 flex-1 w-full">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated EMI Per Month</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-[#0f251c] tracking-tight">${emi.toLocaleString()}</span>
                                    <span className="text-gray-400 text-lg font-medium">/ mo</span>
                                </div>
                            </div>

                            <div className="flex gap-12 border-t border-gray-100 pt-6">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Interest</p>
                                    <p className="text-xl font-bold text-[#0f251c]">${totalInterest.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Payment</p>
                                    <p className="text-xl font-bold text-[#0f251c]">${totalPayment.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Icon Circle */}
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <DollarSign className="h-8 w-8 text-gray-300" />
                        </div>
                    </Card>

                    {/* Breakdown Card */}
                    <Card className="p-8 shadow-sm border-gray-100 bg-white">
                        <h3 className="font-semibold text-lg text-[#0f251c] mb-8">Payment Breakdown</h3>

                        <div className="flex flex-col md:flex-row items-center gap-12">
                            {/* Visual Chart - Upgraded to match screenshot track style */}
                            <div className="flex items-end justify-center gap-8 h-48 bg-white rounded-xl p-6 flex-1 w-full md:w-auto">
                                <div className="flex flex-col items-center gap-3 w-16 group relative h-full justify-end">
                                    <div className="w-12 h-32 bg-[#e2e8f0] rounded-t-lg relative overflow-hidden flex items-end">
                                        <div
                                            className="w-full bg-[#416858] transition-all duration-1000 shadow-sm"
                                            style={{ height: `${Math.max(principalPercentage, 5)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">Principal</span>
                                </div>
                                <div className="flex flex-col items-center gap-3 w-16 group relative h-full justify-end">
                                    <div className="w-12 h-32 bg-[#e2e8f0] rounded-t-lg relative overflow-hidden flex items-end">
                                        <div
                                            className="w-full bg-[#7ec5a2] transition-all duration-1000 shadow-sm"
                                            style={{ height: `${Math.max(interestPercentage, 5)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">Interest</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-4 min-w-[200px]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-[#416858]"></div>
                                        <span className="text-gray-500 font-medium">Principal</span>
                                    </div>
                                    <span className="font-bold text-[#0f251c]">{principalPercentage}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-[#7ec5a2]"></div>
                                        <span className="text-gray-500 font-medium">Interest</span>
                                    </div>
                                    <span className="font-bold text-[#0f251c]">{interestPercentage}%</span>
                                </div>

                                <div className="pt-4 mt-4 border-t border-gray-100 text-center">
                                    <p className="text-xs text-gray-400 mb-1">Total Loan Value:</p>
                                    <p className="text-lg font-bold text-[#0f251c] flex items-center justify-center gap-2">
                                        ${totalPayment.toLocaleString()}
                                        <span className="text-xs font-normal text-[#13EC80] bg-[#13EC80]/10 px-2 py-0.5 rounded-full">+0% fees</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Schedule */}
            <Card className="shadow-sm border-gray-100 overflow-hidden bg-white">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-[#0f251c]">Detailed Payment Schedule</h3>
                        <p className="text-sm text-gray-500 mt-1">Monthly breakdown of beginning balance, payment allocation, and ending balance.</p>
                    </div>
                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                        <button className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-[#0f251c] transition-colors">Yearly View</button>
                        <button className="px-4 py-1.5 text-sm font-medium bg-[#2a5c49] text-white rounded-md shadow-sm">Monthly View</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-xs tracking-wider">
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
                            {schedule.slice(0, showFullSchedule ? undefined : 5).map((row) => (
                                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-[#0f251c]">{row.month}</td>
                                    <td className="px-6 py-4 text-gray-600">${row.beginningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 font-medium text-[#0f251c]">${row.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-[#2a5c49] font-medium">${row.principalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-[#13EC80] font-medium">${row.interestPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right font-bold text-[#0f251c]">${row.endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!showFullSchedule && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => setShowFullSchedule(true)}
                            className="text-[#2a5c49] hover:bg-transparent hover:underline font-medium"
                        >
                            Show full schedule
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
