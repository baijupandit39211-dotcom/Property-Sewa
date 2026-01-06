import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatItem } from "./types";

interface StatsCardProps extends StatItem {
	className?: string;
}

export function StatsCard({
	icon: Icon,
	label,
	value,
	subValue,
	className,
}: StatsCardProps) {
	return (
		<Card
			className={cn(
				"group hover:-translate-y-1 relative cursor-pointer overflow-hidden border-none text-white shadow-lg transition-all duration-300 hover:shadow-xl",
				className || "bg-[#2a5c49]",
			)}
		>
			<CardContent className="relative z-10 p-6">
				<Icon className="mb-4 h-8 w-8 opacity-80" />
				<h3 className="font-semibold text-lg">{label}</h3>
				<p className="mt-1 font-bold text-3xl">
					{value}{" "}
					<span className="font-normal text-sm opacity-70">{subValue}</span>
				</p>
			</CardContent>
			{/* Decorative circle */}
			<div className="-right-6 -bottom-6 absolute h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-110" />
		</Card>
	);
}
