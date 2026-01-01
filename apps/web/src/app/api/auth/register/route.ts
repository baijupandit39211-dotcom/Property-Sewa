import { NextResponse } from "next/server"

const ALLOWED_ROLES = ["buyer", "seller"] as const
export type MockRole = (typeof ALLOWED_ROLES)[number]

interface RegisterBody {
  name?: string
  email?: string
  password?: string
  address?: string
  role?: MockRole | "superadmin"
}

const getBackendBaseUrl = () => {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000"
  )
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RegisterBody
  const { name, email, password, address, role } = body

  if (!name || !email || !password || !address || !role) {
    return NextResponse.json(
      { message: "name, email, password, address, and role are required" },
      { status: 400 },
    )
  }

  if (role === "superadmin") {
    return NextResponse.json(
      { message: "Superadmin cannot be registered via this endpoint" },
      { status: 400 },
    )
  }

  if (!ALLOWED_ROLES.includes(role as MockRole)) {
    return NextResponse.json(
      { message: "Invalid role. Allowed: buyer, seller" },
      { status: 400 },
    )
  }

  const backendUrl = `${getBackendBaseUrl().replace(/\/+$/, "")}/auth/register`

  const backendRes = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password, address, role }),
  })

  const data = await backendRes.json().catch(() => ({}))

  if (!backendRes.ok) {
    const message =
      (data && (data.message || data.error)) ||
      "Registration failed on backend"
    return NextResponse.json({ message }, { status: backendRes.status })
  }

  const cookieName = process.env.COOKIE_NAME || "accessToken"
  const setCookie = backendRes.headers.get("set-cookie") || ""
  const tokenMatch = setCookie.match(
    new RegExp(`${cookieName}=([^;]+)`),
  )
  const token = tokenMatch?.[1] || null

  const res = NextResponse.json(
    {
      user: data.user,
      token,
    },
    { status: 201 },
  )

  if (setCookie) {
    res.headers.set("set-cookie", setCookie)
  }

  return res
}
