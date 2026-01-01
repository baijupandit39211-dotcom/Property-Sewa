export interface Property {
    id: number
    title: string
    price: string
    address?: string
    details?: string // e.g. "3 beds • 2 baths"
    image: string
}

export interface StatItem {
    icon: React.ElementType
    label: string
    value: string | number
    subValue?: string
    color?: string
}
