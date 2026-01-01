"use client"

import { Scale } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ComparePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f251c]">Compare Properties</h1>
                <p className="text-gray-500">Compare features and prices of your selected properties.</p>
            </div>

            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="h-16 w-16 bg-[#f4fbf6] rounded-full flex items-center justify-center mb-4">
                    <Scale className="h-8 w-8 text-[#316249]" />
                </div>
                <h3 className="text-lg font-medium text-[#0f251c] mb-2">No properties to compare</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Select properties from search results or your wishlist to compare them side by side.
                </p>
                <Button className="bg-[#13EC80] text-[#0f251c] hover:bg-[#0eb964]">
                    Browse Properties
                </Button>
            </div>
        </div>
    )
}
