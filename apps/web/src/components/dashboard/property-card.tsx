import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Property } from "./types"

interface PropertyCardProps {
    property: Property
    variant?: "featured" | "recommended" | "list"
}

export function PropertyCard({ property, variant = "featured" }: PropertyCardProps) {
    if (variant === "list") {
        return (
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-[#13EC80]/50 hover:shadow-md hover:-translate-y-0.5 hover:bg-[#fafdfb] transition-all duration-300">
                <div className="relative h-24 w-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        className="object-cover"
                        // Fallback for demo if image fails or is dummy path
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-xs', 'text-neutral-400')
                            if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = 'No Image'
                        }}
                    />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="font-semibold text-[#0f251c]">{property.title}</h3>
                    <p className="text-sm text-gray-500">{property.details || property.address}</p>
                </div>
                <Button className="bg-[#e7f0ea] text-[#16814C] hover:bg-[#d5e6db] hover:text-[#13EC80]">
                    View Details
                </Button>
            </div>
        )
    }

    if (variant === "recommended") {
        return (
            <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                <div className="relative aspect-video w-full bg-gray-200 overflow-hidden">
                    {/* Using Image component but handling possible missing images gracefully for dev */}
                    <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                </div>
                <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-[#0f251c] mb-1 line-clamp-1 group-hover:text-[#16814C] transition-colors">{property.title}</h3>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-1">{property.address}</p>
                    <p className="text-[#16814C] font-bold">{property.price}</p>
                </CardContent>
            </Card>
        )
    }

    // Default: Featured
    return (
        <div className="group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-200 mb-3 shadow-md group-hover:shadow-lg transition-all">
                <Image
                    src={property.image}
                    alt={property.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
            </div>
            <h3 className="font-semibold text-[#0f251c] group-hover:text-[#16814C] transition-colors line-clamp-1">{property.title}</h3>
            <p className="text-[#16814C] font-bold">{property.price}</p>
            <p className="text-sm text-gray-500">{property.details}</p>
        </div>
    )
}
