import { Heart, Bed, Bath, Square, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Property } from "@/types/property"

interface PropertyCardProps {
  property: Property
}

export function PropertyCard({ property }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: property.currency,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-shadow hover:shadow-lg">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.imageUrl || "/placeholder.svg?height=300&width=400&query=modern house property"}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          <Heart className="h-4 w-4 text-zinc-600" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-zinc-900">{formatPrice(property.price)}</p>
            <p className="mt-1 text-sm text-zinc-500">{property.address}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <User className="h-4 w-4 text-emerald-600" />
          </div>
        </div>

        {/* Property Details - Beds, Baths, Area */}
        <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span>
              {property.area.toLocaleString()} {property.areaUnit}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
