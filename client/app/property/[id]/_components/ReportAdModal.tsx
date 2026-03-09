"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Flag, X } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

const REASONS = [
  "Harassment",
  "Unauthorized Sales",
  "Scam and Fake Product",
  "Nudity or Sexual Content",
  "Violence",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

type Props = {
  propertyId?: string | null;
  adId?: string | null;
  open: boolean;
  onClose: () => void;
};

type ReportResponse = {
  success: boolean;
  message?: string;
};

export default function ReportAdModal({ propertyId, adId, open, onClose }: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [reason, setReason] = React.useState<Reason | null>(null);
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");

  const targetId = propertyId || adId || null;

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setReason(null);
    setMessage("");
    setError("");
    setSuccessMsg("");
  }, [open]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onClose, open]);

  if (!open || !mounted) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!targetId) {
      setError("Listing details are missing. Refresh and try again.");
      return;
    }

    if (!reason) {
      setError("Please select a reason.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await apiFetch<ReportResponse>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          propertyId: targetId,
          reason,
          message,
        }),
      });

      setSuccessMsg(response?.message || "Report submitted successfully.");
      window.setTimeout(() => onClose(), 900);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfdf5_100%)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <Flag className="h-3.5 w-3.5" />
                Safety report
              </div>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                Report listing
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Flag listings that look unsafe, misleading, abusive, or suspicious.
                Each user can report the same listing only once.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Why are you reporting this listing?
              </p>
              <div className="mt-4 grid gap-3">
                {REASONS.map((option) => {
                  const active = reason === option;
                  return (
                    <label
                      key={option}
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                        active
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={option}
                        checked={active}
                        onChange={() => setReason(option)}
                        className="mt-1 h-4 w-4 accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-slate-800">{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900" htmlFor="report-message">
                Extra details
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Optional. Add context that helps the moderation team review faster.
              </p>
              <textarea
                id="report-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                placeholder="Example: pricing looks fake, photos don't match, abusive content, or other moderation details."
              />

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                Reports are reviewed by the admin moderation team. False or duplicate
                submissions may be ignored.
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {successMsg ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMsg}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !targetId || !reason}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Flag className="h-4 w-4" />
              {loading ? "Submitting..." : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
