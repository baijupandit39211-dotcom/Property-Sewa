import { Card, CardContent } from "@/components/ui/card"
import type { StatItem } from "./types"
import { cn } from "@/lib/utils"

interface StatsCardProps extends StatItem {
    className?: string
}

export function StatsCard({ icon: Icon, label, value, subValue, className }: StatsCardProps) {
    return (
        <Card className={cn(
            "border-none text-white overflow-hidden relative shadow-lg group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer",
            className || "bg-[#2a5c49]"
        )}>
            <CardContent className="p-6 relative z-10">
                <Icon className="h-8 w-8 mb-4 opacity-80" />
                <h3 className="font-semibold text-lg">{label}</h3>
                <p className="text-3xl font-bold mt-1">
                    {value} <span className="text-sm font-normal opacity-70">{subValue}</span>
                </p>
            </CardContent>
            {/* Decorative circle */}
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform" />
        </Card>
    )
}
