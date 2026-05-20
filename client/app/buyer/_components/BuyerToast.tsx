"use client";

export type BuyerToastTone = "success" | "warning" | "error";

export type BuyerToastState = {
  show: boolean;
  text: string;
  tone?: BuyerToastTone;
};

const BUYER_TOAST_MESSAGES = {
  saved: "Saved successfully",
  removed: "Removed successfully",
  applied: "Applied successfully",
  refreshed: "Refreshed",
  markedRead: "Marked as read",
  compareLimit: "Compare limit reached",
  selectionMissing: "Please select at least one item",
  fetchFailed: "Failed to fetch data",
  updateFailed: "Failed to update",
  timeout: "Request timed out",
} as const;

export type BuyerToastMessageKey = keyof typeof BUYER_TOAST_MESSAGES;

export function showBuyerToast(input: {
  tone?: BuyerToastTone;
  messageKey?: BuyerToastMessageKey;
  fallbackText?: string;
}): { tone: BuyerToastTone; text: string } {
  const tone = input.tone || "success";
  const text =
    (input.messageKey ? BUYER_TOAST_MESSAGES[input.messageKey] : "") ||
    input.fallbackText ||
    "Done";
  return { tone, text };
}

export default function BuyerToast({ show, text, tone = "success" }: BuyerToastState) {
  const bg =
    tone === "error" ? "bg-[#B42318]" : tone === "warning" ? "bg-[#8A5A00]" : "bg-[#316249]";

  return (
    <div
      className={[
        "fixed right-4 top-4 z-[9999] transition-all duration-200 sm:right-6 sm:top-6",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-white/10 ${bg}`}>
        {text}
      </div>
    </div>
  );
}

