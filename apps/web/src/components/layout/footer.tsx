import { Facebook, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

export function Footer() {
	const currentYear = new Date().getFullYear();

	const footerLinks = {
		company: [
			{ label: "About Us", href: "/about" },
			{ label: "Careers", href: "/careers" },
			{ label: "Press", href: "/press" },
			{ label: "Blog", href: "/blog" },
		],
		explore: [
			{ label: "Buy", href: "/properties?purpose=buy" },
			{ label: "Rent", href: "/properties?purpose=rent" },
			{ label: "Sell", href: "/auth/register" },
			{ label: "Agents", href: "/agents" },
		],
		support: [
			{ label: "Help Center", href: "/help" },
			{ label: "Contact Us", href: "/contact" },
			{ label: "FAQ", href: "/faq" },
		],
		legal: [
			{ label: "Terms of Service", href: "/terms" },
			{ label: "Privacy Policy", href: "/privacy" },
			{ label: "Cookie Policy", href: "/cookies" },
		],
	};

	return (
		<footer
			className="relative"
			style={{
				background: "#13EC80",
			}}
		>
			<div className="container relative z-10 mx-auto max-w-7xl px-4 py-14">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
					{/* Brand Column */}
					<div className="col-span-2 md:col-span-3 lg:col-span-1">
						<Link href="/" className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/10">
								<svg
									className="h-5 w-5 text-black"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z" />
								</svg>
							</div>
							<span className="font-bold text-black text-lg">
								Property Sewa
							</span>
						</Link>
						<p className="mt-4 text-black/80 text-sm">
							The modern way to find, buy, and sell your home.
						</p>
					</div>

					{/* Company */}
					<div>
						<h3 className="mb-4 font-semibold text-black">Company</h3>
						<ul className="space-y-3">
							{footerLinks.company.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-black/70 text-sm hover:text-black"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Explore */}
					<div>
						<h3 className="mb-4 font-semibold text-black">Explore</h3>
						<ul className="space-y-3">
							{footerLinks.explore.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-black/70 text-sm hover:text-black"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Support */}
					<div>
						<h3 className="mb-4 font-semibold text-black">Support</h3>
						<ul className="space-y-3">
							{footerLinks.support.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-black/70 text-sm hover:text-black"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Legal */}
					<div>
						<h3 className="mb-4 font-semibold text-black">Legal</h3>
						<ul className="space-y-3">
							{footerLinks.legal.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-black/70 text-sm hover:text-black"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-12 flex flex-col items-center justify-between gap-4 border-black/20 border-t pt-8 md:flex-row">
					<p className="text-black/80 text-sm">
						© {currentYear} Property Sewa. All rights reserved.
					</p>
					<div className="flex items-center gap-4">
						<Link href="#" className="text-black/70 hover:text-black">
							<Twitter className="h-5 w-5" />
						</Link>
						<Link href="#" className="text-black/70 hover:text-black">
							<Facebook className="h-5 w-5" />
						</Link>
						<Link href="#" className="text-black/70 hover:text-black">
							<Instagram className="h-5 w-5" />
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
