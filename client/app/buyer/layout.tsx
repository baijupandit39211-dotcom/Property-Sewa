import type { ReactNode } from "react";
import BuyerShell from "./BuyerShell";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return <BuyerShell>{children}</BuyerShell>;
}
