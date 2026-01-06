import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Property } from "./types";

interface PropertyCardProps {
	property: Property;
	variant?: "featured" | "recommended" | "list";
}

export function PropertyCard({
	property,
	variant = "featured",
}: PropertyCardProps) {
	if (variant === "list") {
		return (
			<div className="hover:-translate-y-0.5 flex flex-col items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#13EC80]/50 hover:bg-[#fafdfb] hover:shadow-md md:flex-row">
				<div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
					<Image
						src={property.image}
						alt={property.title}
						fill
						className="object-cover"
						// Fallback for demo if image fails or is dummy path
						onError={(e) => {
							e.currentTarget.style.display = "none";
							e.currentTarget.parentElement?.classList.add(
								"flex",
								"items-center",
								"justify-center",
								"text-xs",
								"text-neutral-400",
							);
							if (e.currentTarget.parentElement)
								e.currentTarget.parentElement.innerText = "No Image";
						}}
					/>
				</div>
				<div className="flex-1 text-center md:text-left">
					<h3 className="font-semibold text-[#0f251c]">{property.title}</h3>
					<p className="text-gray-500 text-sm">
						{property.details || property.address}
					</p>
				</div>
				<Button className="bg-[#e7f0ea] text-[#16814C] hover:bg-[#d5e6db] hover:text-[#13EC80]">
					View Details
				</Button>
			</div>
		);
	}

	if (variant === "recommended") {
		return (
			<Card className="group hover:-translate-y-1 h-full cursor-pointer overflow-hidden border-none shadow-md transition-all duration-300 hover:shadow-xl">
				<div className="relative aspect-video w-full overflow-hidden bg-gray-200">
					{/* Using Image component but handling possible missing images gracefully for dev */}
					<Image
						src={property.image}
						alt={property.title}
						fill
						className="object-cover transition-transform duration-500 group-hover:scale-110"
					/>
				</div>
				<CardContent className="p-4">
					<h3 className="mb-1 line-clamp-1 font-semibold text-[#0f251c] text-lg transition-colors group-hover:text-[#16814C]">
						{property.title}
					</h3>
					<p className="mb-2 line-clamp-1 text-gray-500 text-sm">
						{property.address}
					</p>
					<p className="font-bold text-[#16814C]">{property.price}</p>
				</CardContent>
			</Card>
		);
	}

	// Default: Featured
	return (
		<div className="group hover:-translate-y-1 cursor-pointer transition-transform duration-300">
			<div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-200 shadow-md transition-all group-hover:shadow-lg">
				<Image
					src={property.image}
					alt={property.title}
					fill
					className="object-cover transition-transform duration-500 group-hover:scale-110"
				/>
			</div>
			<h3 className="line-clamp-1 font-semibold text-[#0f251c] transition-colors group-hover:text-[#16814C]">
				{property.title}
			</h3>
			<p className="font-bold text-[#16814C]">{property.price}</p>
			<p className="text-gray-500 text-sm">{property.details}</p>
		</div>
	);
}
