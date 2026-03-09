"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Flag, MoreVertical, Share2 } from "lucide-react";
import ReportAdModal from "./ReportAdModal";

type Props = {
  adId?: string | null;
  title?: string;
  location?: string;
  variant?: "button" | "icon";
  onReport?: (input: { adId?: string | null; title?: string; location?: string }) => void;
};

type Banner =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function AdActionsMenu({
  adId,
  title,
  location,
  variant = "icon",
  onReport,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [banner, setBanner] = React.useState<Banner>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const fallbackUrl = React.useMemo(
    () => (adId ? `/buyer/property/${adId}` : ""),
    [adId]
  );

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function shareListing() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${fallbackUrl || ""}`
        : fallbackUrl;

    const text = `${title || "Property"}${location ? ` - ${location}` : ""}`;

    try {
      if ((navigator as any)?.share) {
        await (navigator as any).share({
          title: title || "Property",
          text,
          url,
        });
        setBanner(null);
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setBanner({ type: "success", message: "Link copied to clipboard." });
      } else {
        window.prompt("Copy this link:", url);
        setBanner({ type: "success", message: "Copy the link to share." });
      }
    } catch (error: any) {
      const isAbort =
        error?.name === "AbortError" ||
        error?.message?.toLowerCase?.().includes("abort") ||
        error?.message?.toLowerCase?.().includes("cancel");

      if (!isAbort) {
        setBanner({
          type: "error",
          message: error?.message || "Unable to share right now.",
        });
      }
    } finally {
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
        }}
        className={
          variant === "icon"
            ? "inline-flex items-center justify-center p-1 text-slate-800 hover:text-slate-900 active:scale-95"
            : "inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        }
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Open actions"
      >
        <MoreVertical className="h-6 w-6" />
        {variant === "button" ? "Actions" : null}
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void shareListing();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-emerald-50"
          >
            <Share2 className="h-4 w-4 text-emerald-700" />
            Share listing
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onReport) {
                onReport({ adId, title, location });
              } else {
                setReportOpen(true);
              }
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-rose-50"
          >
            <Flag className="h-4 w-4 text-rose-600" />
            Report listing
          </button>
        </div>
      ) : null}

      {banner ? (
        <div
          className={[
            "mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
            banner.type === "success"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
          ].join(" ")}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{banner.message}</span>
        </div>
      ) : null}

      {!onReport ? (
        <ReportAdModal
          propertyId={adId || null}
          adId={adId || null}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </div>
  );
}
