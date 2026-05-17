"use client";

import dynamic from "next/dynamic";

const NotificationsPageContent = dynamic(
  () => import("@/components/notifications/NotificationsPageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="h-36 animate-pulse rounded-[24px] bg-[#edf3ef]" />
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-20 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      </div>
    ),
  }
);

export default function SellerNotificationsPage() {
  return <NotificationsPageContent roleLabel="Seller" />;
}
