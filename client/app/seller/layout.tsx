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
    <div className="h-screen bg-[#F1F7F4] flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50">
        <SellerHeader />
      </div>
      
      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <div className="flex-shrink-0">
          <SellerSidebar />
        </div>
        
        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
