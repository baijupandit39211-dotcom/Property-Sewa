import { cn } from "@/lib/utils";
import type { PropertyStatus } from "@/types/property";

interface PropertyBadgeProps {
	status: PropertyStatus;
	className?: string;
}

export function PropertyBadge({ status, className }: PropertyBadgeProps) {
	const statusStyles: Record<PropertyStatus, string> = {
		"For Sale": "bg-emerald-100 text-emerald-700",
		"For Rent": "bg-blue-100 text-blue-700",
		Sold: "bg-zinc-100 text-zinc-700",
		Rented: "bg-zinc-100 text-zinc-700",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs",
				statusStyles[status],
				className,
			)}
		>
			{status}
		</span>
	);
}
