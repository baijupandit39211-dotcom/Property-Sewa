export type PropertyStatus = "For Sale" | "For Rent" | "Sold" | "Rented"
export type PropertyType = "House" | "Apartment" | "Land" | "Commercial"
export type PropertyPurpose = "buy" | "rent" | "sell"

export interface Property {
  id: string
  title: string
  description: string
  price: number
  currency: string
  city: string
  address: string
  propertyType: PropertyType
  purpose: PropertyPurpose
  status: PropertyStatus
  bedrooms: number
  bathrooms: number
  area: number
  areaUnit: string
  imageUrl: string
  featured: boolean
  createdAt: string
}
