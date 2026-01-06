"use client";

import { PropertyCard } from "@/components/dashboard/property-card";

// Dummy data for wishlist
const wishlistProperties = [
	{
		id: 1,
		title: "Modern Apartment in City Center",
		price: "Rs. 2,50,00,000",
		location: "Baneshwor, Kathmandu",
		beds: 3,
		baths: 2,
		sqft: 1200,
		image: "/images/dashboard-prop-1.png?v=2",
		type: "Apartment",
		status: "For Sale",
	},
	{
		id: 2,
		title: "Luxury Villa with Garden",
		price: "Rs. 5,50,00,000",
		location: "Budhanilkantha, Kathmandu",
		beds: 5,
		baths: 4,
		sqft: 3500,
		image: "/images/dashboard-prop-2.png?v=2",
		type: "House",
		status: "For Sale",
	},
];

export default function WishlistPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl text-[#0f251c]">
					Wishlist / Saved Properties
				</h1>
				<p className="text-gray-500">
					Manage your saved properties and collections.
				</p>
			</div>

			{wishlistProperties.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{wishlistProperties.map((property) => (
						<PropertyCard
							key={property.id}
							property={property}
							variant="recommended"
						/>
					))}
				</div>
			) : (
				<div className="rounded-xl border border-gray-100 bg-white py-12 text-center shadow-sm">
					<p className="text-gray-500">No saved properties yet.</p>
				</div>
			)}
		</div>
	);
}
