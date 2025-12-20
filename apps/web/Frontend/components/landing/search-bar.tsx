"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { PropertyPurpose } from "@/types/property"

export function SearchBar() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<PropertyPurpose>("buy")
  const [location, setLocation] = useState("")
  const [priceRange, setPriceRange] = useState("")
  const [bedsBaths, setBedsBaths] = useState("")
  const [propertyType, setPropertyType] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set("purpose", activeTab)
    if (location) params.set("location", location)
    if (priceRange) params.set("priceRange", priceRange)
    if (bedsBaths) params.set("bedsBaths", bedsBaths)
    if (propertyType) params.set("propertyType", propertyType)
    router.push(`/properties?${params.toString()}`)
  }

  const tabs: { value: PropertyPurpose; label: string }[] = [
    { value: "buy", label: "Buy" },
    { value: "rent", label: "Rent" },
    { value: "sell", label: "Sell" },
  ]

  return (
    <div className="w-full max-w-xl">
      {/* Tabs - Pill toggle style at top of card */}
      <div className="flex overflow-hidden rounded-t-2xl bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 px-8 py-3 text-sm font-medium transition-colors ${activeTab === tab.value ? "bg-white text-zinc-900" : "bg-rgba(80, 86, 83, 1) text-zinc-500 hover:text-zinc-700"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Form Card */}
      <form onSubmit={handleSearch} className="rounded-b-2xl bg-white p-5 shadow-4xl">
        {/* Main Search Row - Input with Search button inside */}
        <div className="relative mb-4 flex items-center rounded-lg border border-zinc-200 bg-white">
          <Search className="ml-3 h-5 w-5 flex-shrink-0 text-black" />
          <Input
            type="text"
            placeholder="Enter an address, neighborhood, city, or ZIP code"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            className="m-1 rounded-lg bg-emerald-500 px-5 text-sm font-medium text-black hover:bg-emerald-600"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>

        {/* Filter Row - Three small dropdowns */}
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 gap-1 rounded-full border-zinc-200 px-4 text-sm font-normal text-black bg-transparent"
              >
                {priceRange || "Price Range"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPriceRange("Under $500K")}>Under $500K</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriceRange("$500K - $1M")}>$500K - $1M</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriceRange("$1M - $2M")}>$1M - $2M</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriceRange("$2M+")}>$2M+</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 gap-1 rounded-full border-zinc-200 px-4 text-sm font-normal text-zinc-600 bg-transparent"
              >
                {bedsBaths || "Beds & Baths"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setBedsBaths("1+ Bed")}>1+ Bed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBedsBaths("2+ Beds")}>2+ Beds</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBedsBaths("3+ Beds")}>3+ Beds</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBedsBaths("4+ Beds")}>4+ Beds</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 gap-1 rounded-full border-zinc-200 px-4 text-sm font-normal text-zinc-600 bg-transparent"
              >
                {propertyType || "Property Type"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPropertyType("House")}>House</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPropertyType("Apartment")}>Apartment</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPropertyType("Land")}>Land</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPropertyType("Commercial")}>Commercial</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </form>
    </div>
  )
}
