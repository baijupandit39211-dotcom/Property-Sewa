"use client";

import type { auth } from "@property-sewa/auth";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

type Session = typeof auth.$Infer.Session;

export default function Dashboard({ session }: { session: Session }) {
	const privateData = useQuery(trpc.privateData.queryOptions());

	return (
		<section className="mt-6 rounded-xl border p-4">
			<h2 className="font-semibold text-lg">
				Welcome back, {session.user.name}
			</h2>
			<p className="mt-2">
				API: {privateData.isLoading ? "Loading..." : privateData.data?.message}
			</p>
		</section>
	);
}
