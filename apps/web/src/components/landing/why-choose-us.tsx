import {
	Clock,
	Eye,
	Filter,
	Headphones,
	ShieldCheck,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
	{
		icon: ShieldCheck,
		title: "Verified Agents",
		description: "Work with the best and most trusted agents in the industry.",
	},
	{
		icon: Eye,
		title: "Transparency Guarantee",
		description: "No hidden fees, clear processes, and honest advice.",
	},
	{
		icon: Filter,
		title: "Smart Filters",
		description:
			"Find the perfect property with our advanced filtering options.",
	},
	{
		icon: Clock,
		title: "Instant Viewing Slots",
		description: "Book property viewings instantly at your convenience.",
	},
	{
		icon: Headphones,
		title: "24/7 Support",
		description: "Our dedicated support team is here for you anytime.",
	},
	{
		icon: TrendingUp,
		title: "Market Insights",
		description: "Stay ahead with real-time data and market trends.",
	},
];

export function WhyChooseUs() {
	return (
		<section className="bg-white py-20 md:py-28">
			<div className="container mx-auto max-w-7xl px-4">
				<div className="text-center">
					<h2 className="font-bold text-3xl text-zinc-900 md:text-4xl">
						Your Partner in Finding a Home
					</h2>
					<p className="mx-auto mt-3 max-w-2xl text-zinc-500">
						We provide a complete service for the sale, purchase, or rental of
						real estate.
					</p>
				</div>

				<div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => (
						<div
							key={feature.title}
							className="flex flex-col items-center text-center"
						>
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
								<feature.icon className="h-6 w-6 text-emerald-500" />
							</div>
							<h3 className="mt-5 font-semibold text-zinc-900">
								{feature.title}
							</h3>
							<p className="mt-2 text-sm text-zinc-500 leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>

				<div className="mt-14 text-center">
					<Button
						className="rounded-full bg-emerald-500 px-8 text-white hover:bg-emerald-600"
						asChild
					>
						<Link href="#how-it-works">How It Works</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
