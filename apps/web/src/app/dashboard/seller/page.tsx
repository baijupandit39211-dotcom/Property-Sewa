"use client"

import Link from "next/link"
import { Home, Search, Bookmark, Scale } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PropertyCard } from "@/components/dashboard/property-card"
import { StatsCard } from "@/components/dashboard/stats-card"
import type { Property, StatItem } from "@/components/dashboard/types"

// Dummy data
const featuredProperties: Property[] = [
    {
        id: 1,
        title: "Charming 3-Bedroom",
        price: "$1,200,000",
        details: "3 beds • 2 baths • 1,800 sq ft",
        image: "/images/dashboard-house-1.png?v=2",
    },
    {
        id: 2,
        title: "Modern Apartment",
        price: "$850,000",
        details: "2 beds • 2 baths • 1,200 sq ft",
        image: "/images/dashboard-apartment-1.png?v=2",
    },
    {
        id: 3,
        title: "Luxury Villa",
        price: "$2,500,000",
        details: "5 beds • 4 baths • 3,500 sq ft",
        image: "/images/dashboard-house-3.png?v=2",
    },
    {
        id: 4,
        title: "Cozy Studio",
        price: "$450,000",
        details: "1 bed • 1 bath • 600 sq ft",
        image: "/images/dashboard-interior-1.png?v=2",
    },
]

const recommendedProperties: Property[] = [
    {
        id: 5,
        title: "Suburban Family Home",
        price: "$950,000",
        address: "123 Maple Drive, Serene Suburb",
        image: "/images/dashboard-house-2.png?v=2",
    },
    {
        id: 6,
        title: "Downtown Penthouse",
        price: "$1,800,000",
        address: "456 City Center, Metropolis",
        image: "/images/dashboard-interior-1.png?v=2",
    },
    {
        id: 7,
        title: "Lakehouse Retreat",
        price: "$1,100,000",
        address: "789 Lakeside, Calm Waters",
        image: "/images/dashboard-house-1.png?v=2",
    },
]

const recentProperties: Property[] = [
    {
        id: 8,
        title: "Modern 2-Bedroom Apartment with City Views",
        price: "",
        details: "2 beds • 2 baths • 1,500 sq ft",
        image: "/images/dashboard-apartment-1.png?v=2",
    },
    {
        id: 9,
        title: "Charming 3-Bedroom Home in Serene Suburb",
        price: "",
        details: "3 beds • 2 baths • 1,800 sq ft",
        image: "/images/dashboard-house-2.png?v=2",
    },
]

const dashboardStats: StatItem[] = [
    {
        icon: Home,
        label: "Recently Viewed",
        value: 3,
        subValue: "properties",
    },
    {
        icon: Search,
        label: "Saved Searches",
        value: 2,
        subValue: "searches",
    },
    {
        icon: Bookmark,
        label: "Saved Properties",
        value: 5,
        subValue: "properties",
    },
    {
        icon: Scale,
        label: "Compared",
        value: 2,
        subValue: "properties",
    },
]

export default function SellerDashboardPage() {
    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#0f251c]">Welcome back, Anya Sharma</h1>
                    <p className="text-[#2a5c49]">Here are properties curated for you</p>
                </div>
                <Link href="/dashboard/seller/calculator">
                    <Button className="bg-[#e7f0ea] text-[#16814C] hover:bg-[#d5e6db] border-none font-medium text-sm h-10 px-6">
                        Mortgage Calculator
                    </Button>
                </Link>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardStats.map((stat) => (
                    <StatsCard key={stat.label} {...stat} />
                ))}
            </div>

            {/* Featured Properties */}
            <section className="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#0f251c]">Featured Properties</h2>
                    <Link href="/properties">
                        <Button variant="link" className="text-[#13EC80] hover:text-[#10c96d] px-0">
                            View All
                        </Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredProperties.map((prop) => (
                        <PropertyCard key={prop.id} property={prop} variant="featured" />
                    ))}
                </div>
            </section>

            {/* Recommended for You */}
            <section className="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#0f251c]">Recommended for You</h2>
                    <Link href="/properties?type=recommended">
                        <Button variant="link" className="text-[#13EC80] hover:text-[#10c96d] px-0">
                            View All
                        </Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendedProperties.map((prop) => (
                        <PropertyCard key={prop.id} property={prop} variant="recommended" />
                    ))}
                </div>
            </section>

            {/* Recently Viewed List */}
            <section className="space-y-5">
                <h2 className="text-xl font-bold text-[#0f251c]">Recently Viewed / Alerts</h2>
                <div className="space-y-4">
                    {recentProperties.map((prop) => (
                        <PropertyCard key={prop.id} property={prop} variant="list" />
                    ))}
                </div>
            </section>
        </div>
    )
}
