"use client"

import { useState } from "react"
import type { AuthUser, UserRole } from "@/types/auth"

interface UseAuthReturn {
  user: AuthUser | null
  isAuthenticated: boolean
  role: UserRole | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user] = useState<AuthUser | null>(null)

  const isAuthenticated = user !== null
  const role = user?.role ?? null

  const login = async (_email: string, _password: string): Promise<void> => {
    // Static mock - will be replaced with Better Auth integration
    return Promise.resolve()
  }

  const logout = async (): Promise<void> => {
    // Static mock - will be replaced with Better Auth integration
    return Promise.resolve()
  }

  const register = async (_email: string, _password: string, _name: string): Promise<void> => {
    // Static mock - will be replaced with Better Auth integration
    return Promise.resolve()
  }

  return {
    user,
    isAuthenticated,
    role,
    login,
    logout,
    register,
  }
}
