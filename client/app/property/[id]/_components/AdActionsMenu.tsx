"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const fallbackUrl = React.useMemo(
    () => (adId ? `/buyer/property/${adId}` : ""),
    [adId]
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 208;
      const viewportPadding = 8;
      const top = rect.bottom + 8;
      const left = Math.max(
        viewportPadding,
        Math.min(rect.right - width, window.innerWidth - width - viewportPadding)
      );
      setMenuPos({ top, left });
    };

    if (menuOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
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
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.preventDefault();
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

      {menuOpen && mounted
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[10010] w-52 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10"
              style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void shareListing();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-emerald-50"
              >
                <Share2 className="h-4 w-4 text-emerald-700" />
                Share property
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
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
                Report property
              </button>
            </div>,
            document.body
          )
        : null}

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
