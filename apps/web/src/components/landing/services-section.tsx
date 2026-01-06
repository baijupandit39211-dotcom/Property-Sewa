import { Building2, Heart, Home, Key, Sparkles } from "lucide-react";

const services = [
	{
		icon: Home,
		title: "Buy a Home",
		description: "Find your dream home from thousands of listings.",
	},
	{
		icon: Key,
		title: "Rent a Home",
		description: "Discover apartments, condos, and houses for rent.",
	},
	{
		icon: Heart,
		title: "Sell a Home",
		description: "Get a free valuation and sell with top agents.",
	},
	{
		icon: Building2,
		title: "Commercial",
		description: "Explore office, retail, and industrial properties.",
	},
	{
		icon: Sparkles,
		title: "New Projects",
		description: "Be the first to know about new constructions.",
	},
];

export function ServicesSection() {
	return (
		<section className="bg-white py-20 md:py-28">
			<div className="container mx-auto max-w-7xl px-4">
				<div className="text-center">
					<h2 className="font-bold text-3xl text-zinc-900 md:text-4xl">
						Everything should be this easy.
					</h2>
					<p className="mt-3 text-zinc-500">Three steps. Three minutes.</p>
				</div>

				<div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
					{services.map((service) => (
						<div
							key={service.title}
							className="flex flex-col items-center rounded-2xl border border-zinc-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-100 bg-white shadow-sm">
								<service.icon className="h-6 w-6 text-emerald-500" />
							</div>
							<h3 className="mt-4 font-semibold text-zinc-900">
								{service.title}
							</h3>
							<p className="mt-2 text-sm text-zinc-500 leading-relaxed">
								{service.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
