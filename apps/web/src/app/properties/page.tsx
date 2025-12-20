"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { PropertyCard } from "@/components/properties/property-card"
import { mockProperties } from "@/lib/data/mock-properties"
import type { PropertyPurpose, PropertyType } from "@/types/property"

function PropertiesContent() {
  const searchParams = useSearchParams()

  const purpose = searchParams.get("purpose") as PropertyPurpose | null
  const location = searchParams.get("location")
  const propertyType = searchParams.get("propertyType") as PropertyType | null

  // Filter properties based on search params
  const filteredProperties = mockProperties.filter((property) => {
    if (purpose && property.purpose !== purpose) return false
    if (propertyType && property.propertyType !== propertyType) return false
    if (location) {
      const searchLower = location.toLowerCase()
      return property.city.toLowerCase().includes(searchLower) || property.address.toLowerCase().includes(searchLower)
    }
    return true
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {purpose === "rent"
            ? "Properties for Rent"
            : purpose === "sell"
              ? "Sell Your Property"
              : "Properties for Sale"}
        </h1>
        {(location || propertyType) && (
          <p className="mt-2 text-zinc-600">
            Showing results
            {location && ` for "${location}"`}
            {propertyType && ` in ${propertyType}`}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-500">{filteredProperties.length} properties found</p>
      </div>

      {/* Property Grid */}
      {filteredProperties.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-zinc-600">No properties found matching your criteria.</p>
          <p className="mt-2 text-zinc-500">Try adjusting your search filters.</p>
        </div>
      )}
    </div>
  )
}

export default function PropertiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-zinc-50">
        <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
          <PropertiesContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
