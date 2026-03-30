"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SellerLeadRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const leadId = String(params?.leadId || "");
    if (!leadId) {
      router.replace("/seller/leads");
      return;
    }

    router.replace(`/seller/leads?lead=${encodeURIComponent(leadId)}`);
  }, [params, router]);

  return null;
}
