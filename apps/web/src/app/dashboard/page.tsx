"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type MockRole = "superadmin" | "user";

const ROLE_STORAGE_KEY = "ps-role";

export default function DashboardEntryPage() {
	const router = useRouter();

	useEffect(() => {
		let storedRole: MockRole | null = null;

		try {
			storedRole =
				(localStorage.getItem(ROLE_STORAGE_KEY) as MockRole | null) ?? null;
		} catch {
			storedRole = null;
		}

		const role: MockRole = storedRole === "superadmin" ? "superadmin" : "user";
		const target =
			role === "superadmin" ? "/dashboard/superadmin" : "/dashboard/seller";

		router.replace(target);
	}, [router]);

	return (
		<main className="p-6">
			<h1 className="font-semibold text-2xl">Redirecting to your dashboard…</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				Use <code>localStorage.setItem("ps-role", "superadmin")</code> or{" "}
				<code>localStorage.setItem("ps-role", "user")</code> in the browser
				console to control which dashboard opens.
			</p>
		</main>
	);
}
