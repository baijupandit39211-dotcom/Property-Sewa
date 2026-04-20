"use client";

import { createContext, useContext, type ReactNode } from "react";

export type BuyerUser = {
  name?: string;
  email?: string;
  role?: string;
};

type BuyerAuthContextValue = {
  user: BuyerUser | null;
};

const BuyerAuthContext = createContext<BuyerAuthContextValue>({
  user: null,
});

export function BuyerAuthProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BuyerAuthContextValue;
}) {
  return <BuyerAuthContext.Provider value={value}>{children}</BuyerAuthContext.Provider>;
}

export function useBuyerAuth() {
  return useContext(BuyerAuthContext);
}
