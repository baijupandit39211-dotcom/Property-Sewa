"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SellerUser = {
  name?: string;
  email?: string;
  role?: string;
};

type SellerAuthContextValue = {
  user: SellerUser | null;
};

const SellerAuthContext = createContext<SellerAuthContextValue>({
  user: null,
});

export function SellerAuthProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SellerAuthContextValue;
}) {
  return <SellerAuthContext.Provider value={value}>{children}</SellerAuthContext.Provider>;
}

export function useSellerAuth() {
  return useContext(SellerAuthContext);
}
