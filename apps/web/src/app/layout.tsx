import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import GoogleProvider from "@/components/providers/google-provider";

import "../styles/globals.css";

const geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Property Sewa - The Modern Way to Find Home",
	description:
		"Discover your next chapter with Property Sewa. Buy, sell, or rent properties with verified listings.",
};

export const viewport: Viewport = {
	themeColor: "#10b981",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={`${geist.className} antialiased`}>
				<GoogleProvider>
					{children}
					<Analytics />
				</GoogleProvider>
			</body>
		</html>
	);
}
