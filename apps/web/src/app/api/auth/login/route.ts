import { NextResponse } from "next/server";

interface LoginBody {
	email?: string;
	password?: string;
}

const getBackendBaseUrl = () => {
	return (
		process.env.API_BASE_URL ||
		process.env.NEXT_PUBLIC_API_BASE_URL ||
		"http://localhost:5000"
	);
};

export async function POST(req: Request) {
	const body = (await req.json().catch(() => ({}))) as LoginBody;
	const { email, password } = body;

	if (!email || !password) {
		return NextResponse.json(
			{ message: "email and password are required" },
			{ status: 400 },
		);
	}

	const backendUrl = `${getBackendBaseUrl().replace(/\/+$/, "")}/auth/login`;

	const backendRes = await fetch(backendUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email, password }),
	});

	const data = await backendRes.json().catch(() => ({}));

	if (!backendRes.ok) {
		const message =
			(data && (data.message || data.error)) || "Login failed on backend";
		return NextResponse.json({ message }, { status: backendRes.status });
	}

	const cookieName = process.env.COOKIE_NAME || "accessToken";
	const setCookie = backendRes.headers.get("set-cookie") || "";
	const tokenMatch = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
	const token = tokenMatch?.[1] || null;

	const res = NextResponse.json(
		{
			user: data.user,
			token,
		},
		{ status: 200 },
	);

	if (setCookie) {
		res.headers.set("set-cookie", setCookie);
	}

	return res;
}
