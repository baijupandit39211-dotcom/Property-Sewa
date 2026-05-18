"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Copy,
  CreditCard,
  AlertTriangle,
  Home,
  Receipt,
  ShieldCheck,
} from "lucide-react";

function KhaltiSuccessPageContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const paymentId = useMemo(
    () => String(sp.get("purchase_order_id") || "").trim(),
    [sp]
  );
  const pidx = useMemo(() => String(sp.get("pidx") || "").trim(), [sp]);
  const transactionId = useMemo(
    () =>
      String(
        sp.get("transaction_id") || sp.get("transactionId") || ""
      ).trim(),
    [sp]
  );

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyErr, setVerifyErr] = useState("");
  const [statusLine, setStatusLine] = useState("Verifying payment...");
  const [backendStatus, setBackendStatus] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [verifyRequestStarted, setVerifyRequestStarted] = useState(false);
  const [pendingTimeout, setPendingTimeout] = useState(false);
  const [summary, setSummary] = useState<{
    amount?: number | string;
    propertyId?: string;
    reservationStatus?: string;
    verifiedAt?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; text: string; tone: "success" | "error" }>({
    show: false,
    text: "",
    tone: "success",
  });
  const verifyStartedRef = useRef(false);
  const successToastShownRef = useRef(false);
  const errorToastShownRef = useRef(false);
  const resolvedRef = useRef(false);
  const statusRecoveryRunningRef = useRef(false);
  const hardFallbackTimerRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const retryDelayTimerRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    if (hardFallbackTimerRef.current) {
      window.clearTimeout(hardFallbackTimerRef.current);
      hardFallbackTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (retryDelayTimerRef.current) {
      window.clearTimeout(retryDelayTimerRef.current);
      retryDelayTimerRef.current = null;
    }
  };

  const fetchPaymentStatusFast = async (id: string, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort("status-timeout"), timeoutMs);
    try {
      return await apiFetch<any>(`/payments/status/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { "x-silent-error": "1" },
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timer);
    }
  };

  const applyCompletedFromResponse = (res: any, fallbackMessage = "Payment verified successfully.") => {
    clearAllTimers();
    resolvedRef.current = true;
    setVerified(true);
    setVerifying(false);
    setPendingTimeout(false);
    setVerifyErr("");
    setVerifyMsg("Payment verified successfully.");
    setStatusLine("Payment verified successfully");
    setBackendStatus(String(res?.paymentStatus || res?.payment?.status || res?.reservationStatus || "paid"));
    setBackendMessage(String(res?.message || fallbackMessage));
    setSummary({
      amount: res?.payment?.amount ?? res?.amount,
      propertyId: res?.propertyId || res?.property?._id || "",
      reservationStatus: res?.reservationStatus || res?.paymentStatus || res?.property?.reservationStatus || "",
      verifiedAt: res?.payment?.updatedAt || res?.payment?.paidAt || res?.payment?.createdAt || "",
    });
  };

  useEffect(() => {
    if (!paymentId) {
      resolvedRef.current = true;
      setVerifying(false);
      setVerified(false);
      setPendingTimeout(false);
      setStatusLine("Verification failed");
      setVerifyErr("Missing purchase_order_id in Khalti callback.");
      setBackendStatus("invalid_request");
      setBackendMessage("Missing purchase_order_id");
      return;
    }

    if (!pidx) {
      resolvedRef.current = true;
      setVerifying(false);
      setVerified(false);
      setPendingTimeout(false);
      setStatusLine("Verification failed");
      setVerifyErr("Missing pidx in Khalti callback.");
      setBackendStatus("invalid_request");
      setBackendMessage("Missing pidx");
      return;
    }
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;
    resolvedRef.current = false;

    let mounted = true;
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 1600;
    hardFallbackTimerRef.current = window.setTimeout(() => {
      if (!mounted || resolvedRef.current) return;
      resolvedRef.current = true;
      setPendingTimeout(true);
      setVerifying(false);
      setVerified(false);
      setVerifyErr("");
      setStatusLine("Payment still pending");
      setVerifyMsg("Verification taking longer than expected. Please try again or contact support.");
      setBackendStatus("pending_timeout");
      setBackendMessage("Verification timed out on client");
    }, 15000);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        retryDelayTimerRef.current = window.setTimeout(() => {
          retryDelayTimerRef.current = null;
          resolve();
        }, ms);
      });

    const isRetryablePendingError = (message: string) => {
      const normalized = String(message || "").toUpperCase();
      return (
        normalized.includes("KHALTI_STATUS_") ||
        normalized.includes("NOT COMPLETED") ||
        normalized.includes("WAITING FOR CONFIRMATION") ||
        normalized.includes("PENDING") ||
        normalized.includes("TIMED OUT")
      );
    };

    (async () => {
      try {
        setVerifying(true);
        setVerified(false);
        setPendingTimeout(false);
        setVerifyErr("");
        setVerifyMsg("");
        setBackendStatus("");
        setBackendMessage("");
        setVerifyRequestStarted(false);
        setStatusLine("Verifying payment...");

        // 1) Fast path: check Mongo payment status first.
        try {
          const statusRes = await fetchPaymentStatusFast(paymentId, 5000);
          if (!mounted || resolvedRef.current) return;
          const statusPayment = String(statusRes?.paymentStatus || "").toLowerCase();
          const statusReservation = String(statusRes?.reservationStatus || "").toLowerCase();
          const nestedStatus = String(statusRes?.payment?.status || "").toLowerCase();
          if (
            statusRes?.success === true ||
            statusPayment === "paid" ||
            statusReservation === "paid" ||
            nestedStatus === "paid"
          ) {
            applyCompletedFromResponse(statusRes, "Payment confirmed from payment status.");
            return;
          }
        } catch {
          // continue to gateway verify flow
        }

        // 2) Verify with Khalti only if not already paid in DB.
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          if (resolvedRef.current || !mounted) return;

          let requestTimeoutId: number | null = null;
          try {
            setVerifyRequestStarted(true);
            console.info("[khalti/verify] starting request", {
              attempt,
              paymentId,
              pidx,
              payload: { paymentId, pidx },
            });
            const controller = new AbortController();
            requestTimeoutId = window.setTimeout(() => {
              controller.abort("request-timeout");
            }, attempt === 1 ? 3000 : 7000);

            const res = await apiFetch<any>("/payments/khalti/verify", {
              method: "POST",
              headers: {
                "x-silent-error": "1",
              },
              signal: controller.signal,
              body: JSON.stringify({
                paymentId,
                pidx,
              }),
            });
            if (requestTimeoutId) window.clearTimeout(requestTimeoutId);
            console.info("[khalti/verify] response", {
              success: res?.success,
              reservationStatus: res?.reservationStatus,
              paymentStatus: res?.payment?.status,
              message: res?.message || "",
            });

            if (!mounted) return;
            const paymentStatusTop = String(res?.paymentStatus || "").toLowerCase();
            const reservationStatusTop = String(res?.reservationStatus || "").toLowerCase();
            const paymentStatusNested = String(res?.payment?.status || "").toLowerCase();
            const isCompleted =
              res?.success === true ||
              paymentStatusTop === "paid" ||
              reservationStatusTop === "paid" ||
              paymentStatusNested === "paid";
            if (isCompleted) {
              applyCompletedFromResponse(res);
              return;
            }
            if (resolvedRef.current) return;
            throw new Error(res?.message || "Verification failed.");
          } catch (e: any) {
            if (requestTimeoutId) window.clearTimeout(requestTimeoutId);
            if (!mounted || resolvedRef.current) return;
            const isAbort =
              e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
            const reason = isAbort
              ? "Verification request timed out."
              : String(e?.message || "Verification failed.");
            console.info("[khalti/verify] error", { reason });
            const retryable = isRetryablePendingError(reason);

            if (retryable && attempt < MAX_ATTEMPTS) {
              setStatusLine("Payment received, waiting for confirmation...");
              setVerifyMsg(`Confirmation pending. Retrying (${attempt}/${MAX_ATTEMPTS})...`);
              setBackendStatus("pending");
              setBackendMessage(reason);
              // no retry delay before first result; only delay from second cycle onward
              if (attempt === 1) continue;
              await wait(RETRY_DELAY_MS);
              continue;
            }

            resolvedRef.current = true;
            clearAllTimers();
            setPendingTimeout(false);
            setStatusLine("Verification failed");
            setVerifyErr(reason);
            setBackendStatus("failed");
            setBackendMessage(reason);
            return;
          }
        }
      } catch (e: any) {
        if (!mounted || resolvedRef.current) return;
        resolvedRef.current = true;
        clearAllTimers();
        setStatusLine("Verification failed");
        setVerifyErr(e?.message || "Verification failed.");
        setBackendStatus("failed");
        setBackendMessage(String(e?.message || "Verification failed."));
      } finally {
        if (!mounted) return;
        if (resolvedRef.current) {
          setVerifying(false);
        }
      }
    })();

    return () => {
      mounted = false;
      clearAllTimers();
    };
  }, [paymentId, pidx, transactionId, retryNonce]);

  useEffect(() => {
    if (!pendingTimeout || verified || !paymentId || statusRecoveryRunningRef.current) return;
    statusRecoveryRunningRef.current = true;
    let mounted = true;

    const recoverFromPaymentStatus = async () => {
      try {
        const statusRes = await fetchPaymentStatusFast(paymentId, 5000);
        if (!mounted) return;

        const paymentStatusTop = String(statusRes?.paymentStatus || "").toLowerCase();
        const reservationStatusTop = String(statusRes?.reservationStatus || "").toLowerCase();
        const paymentStatusNested = String(statusRes?.payment?.status || "").toLowerCase();
        const isCompleted =
          statusRes?.success === true ||
          paymentStatusTop === "paid" ||
          reservationStatusTop === "paid" ||
          paymentStatusNested === "paid";

        if (isCompleted) {
          applyCompletedFromResponse(statusRes, "Payment confirmed from latest payment status.");
        }
      } catch {
        // keep current pending timeout state
      } finally {
        statusRecoveryRunningRef.current = false;
      }
    };

    recoverFromPaymentStatus();

    return () => {
      mounted = false;
    };
  }, [pendingTimeout, verified, paymentId]);

  // Keep checking Mongo payment status in the background while verifying/pending.
  useEffect(() => {
    if (!paymentId || verified || (!verifying && !pendingTimeout)) return;
    let stopped = false;
    const poll = async () => {
      if (stopped || verified) return;
      try {
        const statusRes = await fetchPaymentStatusFast(paymentId, 5000);
        if (stopped || verified) return;
        const paymentStatusTop = String(statusRes?.paymentStatus || "").toLowerCase();
        const reservationStatusTop = String(statusRes?.reservationStatus || "").toLowerCase();
        const paymentStatusNested = String(statusRes?.payment?.status || "").toLowerCase();
        const isCompleted =
          statusRes?.success === true ||
          paymentStatusTop === "paid" ||
          reservationStatusTop === "paid" ||
          paymentStatusNested === "paid";
        if (isCompleted) {
          applyCompletedFromResponse(statusRes, "Payment confirmed from latest payment status.");
        }
      } catch {
        // ignore intermittent status check failures
      }
    };

    // immediate check when entering verifying/pending state
    poll();
    const interval = window.setInterval(poll, 3000);

    const stopAfter = window.setTimeout(() => {
      stopped = true;
      window.clearInterval(interval);
    }, 90000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.clearTimeout(stopAfter);
    };
  }, [paymentId, verified, verifying, pendingTimeout]);

  // Safety watchdog: if UI stays in verifying state for too long, force pending state.
  useEffect(() => {
    if (!verifying || verified || pendingTimeout) return;
    watchdogTimerRef.current = window.setTimeout(() => {
      if (!verifying || verified || pendingTimeout) return;
      resolvedRef.current = true;
      setPendingTimeout(true);
      setVerifying(false);
      setVerified(false);
      setVerifyErr("");
      setStatusLine("Payment still pending");
      setVerifyMsg("Verification taking longer than expected. Please try again or contact support.");
      setBackendStatus("pending_timeout");
      setBackendMessage("Watchdog timeout after 15s");
    }, 15000);
    return () => {
      if (watchdogTimerRef.current) {
        window.clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [verifying, verified, pendingTimeout]);

  useEffect(() => {
    if (verified && !successToastShownRef.current) {
      successToastShownRef.current = true;
      setToast({
        show: true,
        tone: "success",
        text: "Payment successful. Your reservation has been confirmed.",
      });
      const timer = window.setTimeout(() => {
        setToast((current) => ({ ...current, show: false }));
      }, 1700);
      return () => window.clearTimeout(timer);
    }
  }, [verified]);

  useEffect(() => {
    if (!verifying && !verified && verifyErr && !errorToastShownRef.current) {
      errorToastShownRef.current = true;
      setToast({
        show: true,
        tone: "error",
        text: "Payment verification failed. Please contact support if money was deducted.",
      });
      const timer = window.setTimeout(() => {
        setToast((current) => ({ ...current, show: false }));
      }, 2200);
      return () => window.clearTimeout(timer);
    }
  }, [verifying, verified, verifyErr]);

  const displayTxnId = transactionId || pidx || "";
  const displayAmount =
    summary?.amount !== undefined && summary?.amount !== null && Number(summary.amount) > 0
      ? `NPR ${Number(summary.amount).toLocaleString()}`
      : "Not available";
  const displayDateTime = summary?.verifiedAt
    ? new Date(summary.verifiedAt).toLocaleString()
    : "";

  async function copyTransactionId() {
    if (!displayTxnId) return;
    try {
      await navigator.clipboard.writeText(displayTxnId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  }

  function handleTryAgain() {
    verifyStartedRef.current = false;
    resolvedRef.current = false;
    errorToastShownRef.current = false;
    setPendingTimeout(false);
    setVerifyErr("");
    setVerifyMsg("");
    setVerified(false);
    setStatusLine("Verifying payment...");
    setRetryNonce((prev) => prev + 1);
  }

  // Auto-retry by reusing the exact manual Try Again logic.
  useEffect(() => {
    if (!pendingTimeout || verified) return;

    let stopped = false;
    const startedAt = Date.now();

    const runRetry = () => {
      if (stopped || verified) return;
      if (Date.now() - startedAt > 60000) return;
      handleTryAgain();
    };

    const first = window.setTimeout(runRetry, 1000);
    const interval = window.setInterval(() => {
      if (stopped || verified) return;
      if (Date.now() - startedAt > 60000) {
        window.clearInterval(interval);
        return;
      }
      runRetry();
    }, 3000);

    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [pendingTimeout, verified]);

  const isFailed = !verifying && !verified && !pendingTimeout && Boolean(verifyErr);
  const isStillPending = !verifying && !verified && pendingTimeout;
  const isPending = verifying;
  const pageTitle = isPending
    ? "Verifying Payment"
    : verified
    ? "Payment Completed"
    : isStillPending
    ? "Payment Still Pending"
    : "Payment Verification Failed";
  const pageSubtitle = isPending
    ? "We are securely confirming your Khalti transaction with Property Sewa."
    : verified
    ? "Your payment was securely verified with Property Sewa."
    : isStillPending
    ? "We are still waiting for final confirmation from Khalti. Please try again shortly."
    : "We could not verify your payment yet. Please review the details below.";

  return (
    <main className="min-h-screen bg-[#F3F8F5] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
      <div
        className={[
          "fixed right-4 top-4 z-[9999] transition-all duration-200 sm:right-6 sm:top-6",
          toast.show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        ].join(" ")}
      >
        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md",
            toast.tone === "success" ? "bg-[#316249]" : "bg-[#B42318]",
          ].join(" ")}
        >
          {toast.text}
        </div>
      </div>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111827] ring-1 ring-[#D1D5DB] transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="mt-5 rounded-3xl bg-white p-5 shadow-[0_16px_40px_rgba(13,28,18,0.08)] ring-1 ring-[#DDE5E0] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 rounded-2xl p-2.5 ring-1",
                  verified || verifying
                    ? "bg-[#E8F4EE] ring-[#CFE4D8]"
                    : "bg-[#FFF1F1] ring-[#F4C7C7]",
                ].join(" ")}
              >
                {verified || verifying ? (
                  <CheckCircle2
                    className={[
                      "h-7 w-7 text-[#316249]",
                      verified ? "animate-pulse" : "",
                    ].join(" ")}
                  />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-[#B42318]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                  {pageTitle}
                </h1>
                <p className="mt-1 text-sm text-[#4B5563]">
                  {pageSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FBFA] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <ShieldCheck className="h-4 w-4" />
                Verification Status
              </div>
              <div className="mt-2 text-sm">
                {verifying && (
                  <div className="flex items-center gap-2 font-semibold text-[#374151]">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-r-2 border-[#316249]" />
                    {statusLine || "Verifying payment..."}
                  </div>
                )}
                {!verifying && verified && (
                  <div className="font-semibold text-[#316249]">
                    Payment verified successfully
                    {verifyMsg ? (
                      <div className="mt-1 text-xs font-medium text-[#4B5563]">{verifyMsg}</div>
                    ) : null}
                  </div>
                )}
                {!verifying && !verified && verifyErr && (
                  <div className="font-semibold text-[#B42318]">
                    Payment verification failed
                    <div className="mt-1 text-xs font-medium text-[#4B5563]">{verifyErr}</div>
                  </div>
                )}
                {!verifying && !verified && pendingTimeout && !verifyErr && (
                  <div className="font-semibold text-[#7C6A22]">
                    Payment still pending
                    {verifyMsg ? (
                      <div className="mt-1 text-xs font-medium text-[#4B5563]">{verifyMsg}</div>
                    ) : null}
                  </div>
                )}
                {backendStatus ? (
                  <div className="mt-2 text-xs text-[#6B7280]">
                    Backend status: <span className="font-semibold text-[#111827]">{backendStatus}</span>
                    {backendMessage ? (
                      <>
                        {" "}
                        - <span className="text-[#4B5563]">{backendMessage}</span>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {verified ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#DDE7E1] bg-[#F7FBF9] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#316249]">
                    <ShieldCheck className="h-4 w-4" />
                    Secure payment verified
                  </div>
                </div>
                <div className="rounded-2xl border border-[#DDE7E1] bg-[#F7FBF9] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#316249]">
                    <Home className="h-4 w-4" />
                    Reservation confirmed
                  </div>
                </div>
                <div className="rounded-2xl border border-[#DDE7E1] bg-[#F7FBF9] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#316249]">
                    <Receipt className="h-4 w-4" />
                    Receipt generated
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827]">
              Transaction Summary
            </h2>

            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#6B7280]">Amount paid</span>
                <span className="font-semibold text-[#111827]">{displayAmount}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#6B7280]">Payment method</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#111827]">
                  <CreditCard className="h-4 w-4 text-[#316249]" />
                  Khalti
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#6B7280]">Property / order ref</span>
                <span className="break-all text-right font-semibold text-[#111827]">
                  {summary?.propertyId || paymentId || "-"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#6B7280]">Transaction ID</span>
                <span className="break-all text-right font-semibold text-[#111827]">
                  {displayTxnId || "-"}
                </span>
              </div>
              {displayDateTime ? (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[#6B7280]">Date / time</span>
                  <span className="text-right font-semibold text-[#111827]">{displayDateTime}</span>
                </div>
              ) : null}
            </div>

            {displayTxnId ? (
              <button
                type="button"
                onClick={copyTransactionId}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-semibold text-[#111827] transition hover:bg-slate-50"
              >
                {copied ? <Clipboard className="h-4 w-4 text-[#316249]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy transaction ID"}
              </button>
            ) : null}

            <div
              className={[
                "mt-4 rounded-xl border p-3 text-xs",
                verified
                  ? "border-[#E5E7EB] bg-[#F8FAFC] text-[#4B5563]"
                  : isPending || pendingTimeout
                  ? "border-[#F2E8C9] bg-[#FFFBEB] text-[#7C6A22]"
                  : "border-[#F3D3D1] bg-[#FEF3F2] text-[#7F1D1D]",
              ].join(" ")}
            >
              Reservation status:{" "}
              <span className="font-semibold text-[#111827]">
                {summary?.reservationStatus || (verified ? "confirmed" : "pending")}
              </span>
            </div>
          </div>
        </div>

        <div className={["mt-6 grid gap-3", verified ? "sm:grid-cols-3" : "sm:grid-cols-2"].join(" ")}>
          <button
            onClick={() =>
              router.push(summary?.propertyId ? `/buyer/property/${summary.propertyId}` : "/buyer/search-properties")
            }
            className="w-full rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2A523D]"
          >
            View Property
          </button>
          {verified ? (
            <>
              <button
                onClick={() => router.push("/buyer/buyer-dashboard")}
                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#111827] ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push("/buyer/scheduled-visits")}
                className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#111827] ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                View Scheduled Visits
              </button>
            </>
          ) : isFailed || pendingTimeout ? (
            <button
              onClick={handleTryAgain}
              className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#111827] ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Try Again
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#6B7280] ring-1 ring-slate-200"
            >
              Verifying...
            </button>
          )}
        </div>
      </section>
      </div>
    </main>
  );
}

export default function KhaltiSuccessPage() {
  return (
    <Suspense fallback={null}>
      <KhaltiSuccessPageContent />
    </Suspense>
  );
}
