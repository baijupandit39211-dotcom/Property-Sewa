"use client";

import React from "react";
import SellerHeader from "@/components/seller/SellerHeader";
import SellerSidebar from "@/components/seller/SellerSidebar";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1F7F4]">
      <SellerHeader />
      <div className="flex">
        <SellerSidebar />
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
