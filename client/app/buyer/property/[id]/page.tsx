"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import AdActionsMenu from "@/app/property/[id]/_components/AdActionsMenu";
import OfferBadge from "@/components/offers/OfferBadge";
import {
  Send,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  ShieldCheck,
  Calendar,
  Clock,
  X,
  Heart,
  BadgeCheck,
  Phone,
  CreditCard,
  ExternalLink,
  Banknote, // ✅ ADD
} from "lucide-react";

const AMENITIES = [
  "Parking",
  "Water",
  "Electricity Backup",
  "Security",
  "Lift",
  "Wifi",
  "AC",
  "Balcony",
  "Garden",
  "Gym",
] as const;

// ✅ helper: only show fields if value is real (not "", null, undefined, "0")
const hasValue = (v: any) =>
  v !== null &&
  v !== undefined &&
  String(v).trim() !== "" &&
  String(v).trim() !== "0";

// ✅ format helper
function money(currency: string | undefined, value: any) {
  const c = currency || "Rs";
  const n = Number(value || 0);
  return `${c} ${n.toLocaleString()}`;
}

// ✅ coords helper (lat,lng)
function isLatLng(v: string) {
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(v);
}
function parseLatLng(v: string) {
  const [latRaw, lngRaw] = v.split(",");
  const lat = String(latRaw || "").trim();
  const lng = String(lngRaw || "").trim();
  if (!lat || !lng) return null;
  if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;
  return { lat, lng };
}

// ✅ Extract coords from google url containing .../@lat,lng
function extractLatLngFromGoogleUrl(url: string) {
  const m = url.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
  if (!m) return null;
  return { lat: m[1], lng: m[3] };
}

/**
 * ✅ Availability logic (YOUR RULES)
 * Available ✅  -> reservationStatus none/cancelled/expired OR reservedUntil already passed OR invalid/missing date
 * Reserved 🟡   -> reservationStatus === "reserved" AND reservedUntil > now (must be valid future)
 * Booked 🔴     -> reservationStatus === "paid"
 */
type Availability = "available" | "reserved" | "booked";

// ✅ safer date parse: invalid -> 0
function toTime(v: any) {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function getAvailability(p: any): Availability {
  const rs = String(p?.reservationStatus || "none").toLowerCase();
  const until = p?.reservedUntil ? toTime(p.reservedUntil) : 0;
  const now = Date.now();
  const hasValidUntil = until > 0;

  // 🔴 Booked
  if (rs === "paid") return "booked";

  // 🟡 Reserved ONLY if reserved + valid future reservedUntil
  if (rs === "reserved" && hasValidUntil && until > now) return "reserved";

  // ✅ Everything else -> available (including invalid/missing/past reservedUntil)
  return "available";
}

function formatReservedUntil(p: any) {
  const t = p?.reservedUntil ? new Date(p.reservedUntil).getTime() : 0;
  if (!Number.isFinite(t) || t <= Date.now()) return "";
  return new Date(t).toLocaleString();
}

function formatOfferDiscount(p: any) {
  const type = String(p?.offerDiscountType || "none").toLowerCase();
  const value = Number(p?.offerDiscountValue || 0);
  if (!value || value <= 0) return "";
  if (type === "percentage") return `${value}% off`;
  if (type === "fixed") return `${p?.currency || "Rs"} ${value.toLocaleString()} off`;
  return "";
}

function formatOfferExpiry(value: any) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getOfferExpiryState(value: any) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Offer expired", tone: "rose" as const };
  }
  if (diffDays === 0) {
    return { text: "Ends today", tone: "amber" as const };
  }
  if (diffDays <= 2) {
    return {
      text: `Ends in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      tone: "amber" as const,
    };
  }
  return { text: `Ends in ${diffDays} days`, tone: "emerald" as const };
}

function isOfferActive(value: any) {
  return value === true || String(value).toLowerCase() === "true";
}

function BuyerPropertyDetailsView({
  property,
  paramsId,
}: {
  property: any;
  paramsId: any;
}) {
  const router = useRouter();

  // inquiry form (KEEP)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // UI only
  const [activeImg, setActiveImg] = useState<string>("");

  // Similar (UI)
  const [similar, setSimilar] = useState<any[]>([]);

  // ✅ Wishlist UI
  const [wishlisted, setWishlisted] = useState(false);

  // ✅ Contact Agent scroll
  const inquiryRef = useRef<HTMLDivElement | null>(null);

  // ✅ Schedule modal (KEEP)
  const [openSchedule, setOpenSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const [visitData, setVisitData] = useState({
    requestedDate: "",
    preferredTime: "",
    message: "",
  });

  // ✅ Normalize images
  const images: string[] = useMemo(() => {
    const arr = (property?.images || [])
      .map((x: any) => x?.url)
      .filter(Boolean);
    if (arr.length > 0) return arr;
    return ["https://via.placeholder.com/1200x700?text=No+Image"];
  }, [property]);

  // ✅ Amenities safe read (array or json string)
  const amenities: string[] = useMemo(() => {
    const a = property?.amenities;
    if (!a) return [];
    if (Array.isArray(a)) return a.filter(Boolean);
    try {
      const parsed = JSON.parse(a);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [property]);

  // ✅ seller info: support multiple shapes
  const seller =
    property?.seller || property?.createdBy || property?.owner || null;

  // ✅ Availability (YOUR RULES) - UI only
  const availability = useMemo(() => getAvailability(property), [property]);
  const reservedUntilText = useMemo(
    () => formatReservedUntil(property),
    [property]
  );
  const isAvailable = availability === "available";
  const isReserved = availability === "reserved";
  const isBooked = availability === "booked";

  // ✅ first image as active
  useEffect(() => {
    const firstImg =
      images?.[0] || "https://via.placeholder.com/1200x700?text=No+Image";
    setActiveImg(firstImg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?._id]);

  // ✅ Auto-fill user
  useEffect(() => {
    (async () => {
      try {
        const userResponse = await apiFetch<{ success: boolean; user: any }>(
          "/auth/me"
        );
        if (userResponse?.success) {
          setFormData((prev) => ({
            ...prev,
            name: userResponse?.user?.name || "",
            email: userResponse?.user?.email || "",
            phone: userResponse?.user?.phone || prev.phone || "",
          }));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // ✅ Similar properties (UI-only)
  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetch<{ success: boolean; items: any[] }>(
          "/properties?limit=12"
        );
        if (list?.success) {
          const items = (list.items || []).filter(
            (p) => String(p?._id) !== String(paramsId)
          );

          const withImages = items.filter((p) => p?.images?.[0]?.url);
          const withoutImages = items.filter((p) => !p?.images?.[0]?.url);

          setSimilar([...withImages, ...withoutImages].slice(0, 3));
        }
      } catch {
        // ignore
      }
    })();
  }, [paramsId]);

  // ✅ wishlist state
  useEffect(() => {
    if (!property?._id) return;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; saved: boolean }>(
          `/wishlist/check/${property._id}`
        );
        setWishlisted(!!res?.saved);
      } catch {
        setWishlisted(false);
      }
    })();
  }, [property?._id]);

  const listingType = String(property?.listingType || "").toLowerCase();
  const isRent = listingType === "rent";

  // ✅ Wishlist toggle (localStorage)
  const toggleWishlist = async () => {
    if (!property?._id) return;

    const id = String(property._id);

    try {
      if (wishlisted) {
        await apiFetch(`/wishlist/${id}`, { method: "DELETE" });
        setWishlisted(false);
      } else {
        await apiFetch("/wishlist", {
          method: "POST",
          body: JSON.stringify({ propertyId: id }),
        });
        setWishlisted(true);
      }
    } catch {
      // ignore
    }
  };

  // ✅ Inquiry submit (KEEP)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!property?._id) {
      setError("Property not loaded. Please refresh the page.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const response = await apiFetch<{ success: boolean; lead: any }>(
        "/leads",
        {
          method: "POST",
          body: JSON.stringify({
            propertyId: property._id,
            ...formData,
          }),
        }
      );

      if (response?.success) {
        setSuccess(true);
        setFormData((prev) => ({ ...prev, message: "" }));
      } else {
        setError("Failed to send inquiry");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Contact Agent works (scroll)
  const handleContactAgent = () => {
    inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const textarea = document.getElementById(
        "inquiry-message"
      ) as HTMLTextAreaElement | null;
      textarea?.focus();
    }, 250);
  };

  // ✅ Schedule Visit open (KEEP)
  const handleOpenSchedule = () => {
    setScheduleError("");
    setScheduleSuccess(false);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultDate = `${yyyy}-${mm}-${dd}`;

    setVisitData((prev) => ({
      requestedDate: prev.requestedDate || defaultDate,
      preferredTime: prev.preferredTime || "10:00",
      message:
        prev.message ||
        `Hi, I'd like to schedule a visit for "${
          property?.title || "this property"
        }".`,
    }));

    setOpenSchedule(true);
  };

  // ✅ Schedule Visit submit (KEEP)
  const submitScheduleVisit = async () => {
    if (!property?._id) {
      setScheduleError("Property not loaded. Please refresh.");
      return;
    }
    if (!visitData.requestedDate || !visitData.preferredTime) {
      setScheduleError("Please choose date and time.");
      return;
    }

    setScheduleLoading(true);
    setScheduleError("");
    setScheduleSuccess(false);

    try {
      const res = await apiFetch<{ success: boolean; message?: string }>(
        "/visits",
        {
          method: "POST",
          body: JSON.stringify({
            propertyId: property._id,
            requestedDate: visitData.requestedDate,
            preferredTime: visitData.preferredTime,
            message: visitData.message,
          }),
        }
      );

      if (res?.success) {
        setScheduleSuccess(true);
        setTimeout(() => setOpenSchedule(false), 900);
      } else {
        setScheduleError(res?.message || "Failed to schedule visit.");
      }
    } catch (err: any) {
      setScheduleError(err?.message || "Failed to schedule visit.");
    } finally {
      setScheduleLoading(false);
    }
  };

  function getUniqueSimilarImage(p: any, used: Set<string>) {
    const urls: string[] = (p?.images || [])
      .map((x: any) => x?.url)
      .filter(Boolean);
    for (const u of urls) {
      if (!used.has(u)) {
        used.add(u);
        return u;
      }
    }
    return urls[0] || "https://via.placeholder.com/900x600?text=No+Image";
  }

  const usedSimilarImgs = new Set<string>();
  if (activeImg) usedSimilarImgs.add(activeImg);

  const showBeds = hasValue(property?.beds);
  const showBaths = hasValue(property?.baths);
  const showSqft = hasValue(property?.sqft);

  // ✅ Google Map stored in landmark (supports coords or link)
  const showGoogleMap = hasValue(property?.landmark);
  const googleMapRaw = String(property?.landmark || "").trim();

  // ✅ resolve map type
  const mapCoords =
    isLatLng(googleMapRaw)
      ? parseLatLng(googleMapRaw)
      : googleMapRaw.startsWith("http")
      ? extractLatLngFromGoogleUrl(googleMapRaw)
      : null;

  // ✅ embed url (works for both)
  const mapEmbedUrl = useMemo(() => {
    if (!showGoogleMap) return "";
    if (mapCoords?.lat && mapCoords?.lng) {
      const q = encodeURIComponent(`${mapCoords.lat},${mapCoords.lng}`);
      return `https://www.google.com/maps?q=${q}&z=16&output=embed`;
    }
    if (googleMapRaw.startsWith("http")) {
      return `https://www.google.com/maps?q=${encodeURIComponent(
        googleMapRaw
      )}&output=embed`;
    }
    return "";
  }, [showGoogleMap, googleMapRaw, mapCoords?.lat, mapCoords?.lng]);

  const showMonthlyRent = isRent && hasValue(property?.monthlyRent);
  const showDeposit = isRent && hasValue(property?.deposit);
  const showAvailability = isRent && hasValue(property?.availabilityDate);

  const showAdvance = hasValue(property?.advanceAmount);
  const showOffer = isOfferActive(property?.offerActive);
  const offerDiscountText = useMemo(() => formatOfferDiscount(property), [property]);
  const offerExpiryText = useMemo(() => formatOfferExpiry(property?.offerValidUntil), [property?.offerValidUntil]);
  const offerExpiryState = useMemo(
    () => getOfferExpiryState(property?.offerValidUntil),
    [property?.offerValidUntil]
  );

  const openGoogleMap = () => {
    if (mapCoords?.lat && mapCoords?.lng) {
      const q = encodeURIComponent(`${mapCoords.lat},${mapCoords.lng}`);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${q}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    if (googleMapRaw && googleMapRaw.startsWith("http")) {
      window.open(googleMapRaw, "_blank", "noopener,noreferrer");
      return;
    }

    const q = encodeURIComponent(
      `${property?.address || ""} ${property?.location || ""}`.trim() ||
        "Kathmandu"
    );
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${q}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ✅ pay advance button (KEEP)
  const goToPayment = () => {
    if (!property?._id) return;
    router.push(`/buyer/property/${property._id}/payment`);
  };

  // ✅ NEW: go to COD page (functional)
  const goToCOD = () => {
    if (!property?._id) return;
    router.push(`/buyer/property/${property._id}/advance-payment`);
  };

  return (
    <main className="min-h-screen w-full min-w-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.10),transparent_22%),linear-gradient(180deg,#f4fff9_0%,#eefbf5_100%)] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl">
      {/* top action buttons */}
      <div className="mb-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={toggleWishlist}
          className={[
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-sm ring-1 transition",
            wishlisted
              ? "bg-rose-600 text-white ring-rose-600 hover:bg-rose-700"
              : "bg-emerald-700 text-white ring-emerald-700 hover:bg-emerald-800",
          ].join(" ")}
        >
          <Heart className="h-4 w-4" />
          {wishlisted ? "Saved" : "Add to Wishlist"}
        </button>

        <AdActionsMenu
          adId={property?._id}
          title={property?.title}
          location={property?.location || property?.address}
        />
      </div>

      {/* HERO */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-[32px] border border-emerald-100/80 bg-white shadow-[0_24px_70px_-36px_rgba(16,185,129,0.35)] ring-1 ring-emerald-100/70">
            <img
              src={activeImg || images[0]}
              alt={property?.title || "Property"}
              className="h-[420px] w-full object-cover"
            />

            <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 ring-1 ring-black/10">
                {property?.status
                  ? String(property.status).toUpperCase()
                  : "FEATURED"}
              </span>

              {isAvailable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-semibold text-white ring-1 ring-emerald-700/40">
                  ✅ Available
                </span>
              )}
              {isReserved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-semibold text-white ring-1 ring-amber-600/40">
                  🟡 Reserved
                </span>
              )}
              {isBooked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/95 px-3 py-1 text-xs font-semibold text-white ring-1 ring-rose-700/40">
                  🔴 Booked
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-semibold text-white ring-1 ring-emerald-700/40">
                <BadgeCheck className="h-4 w-4" />
                Verified
              </span>

              {showOffer && (
                <OfferBadge
                  category={property?.offerCategory}
                  active={property?.offerActive}
                  label={property?.offerBadge || property?.offerTitle}
                />
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-6 sm:p-7">
              <h2 className="text-xl font-extrabold text-white">
                {property?.title || "Property"}
              </h2>
              <p className="mt-1 text-sm text-white/80">
                {property?.address || property?.location || "Location"}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="grid grid-cols-2 gap-4">
            {images.slice(0, 4).map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImg(url)}
                className={[
                  "group overflow-hidden rounded-[24px] border bg-white transition",
                  url === activeImg
                    ? "border-emerald-400 shadow-[0_16px_36px_-24px_rgba(16,185,129,0.45)] ring-2 ring-emerald-200"
                    : "border-emerald-100 ring-1 ring-black/5 hover:border-emerald-300 hover:shadow-sm",
                ].join(" ")}
                title="View image"
              >
                <img
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-[132px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#f4fff8_0%,#ecfdf5_100%)] p-5 shadow-sm ring-1 ring-emerald-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-emerald-600 p-2 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-emerald-900">
                  Safe & Verified Listings
                </div>
                <div className="mt-1 text-sm text-emerald-900/70">
                  We review listings to reduce spam and fake posts.
                </div>
              </div>
            </div>
          </div>

          {(isReserved || isBooked) && (
            <div
              className={[
                "mt-4 rounded-[24px] px-4 py-3 text-sm shadow-sm ring-1",
                isReserved
                  ? "border-amber-200 bg-amber-50 text-amber-900 ring-amber-200"
                  : "border-rose-200 bg-rose-50 text-rose-900 ring-rose-200",
              ].join(" ")}
            >
              {isReserved ? (
                <>
                  ⏳ This property is currently reserved
                  {reservedUntilText ? ` until ${reservedUntilText}` : ""}.
                </>
              ) : (
                <>⛔ This property has been booked (confirmed).</>
              )}
            </div>
          )}
        </div>
      </section>

      {/* DETAILS + RIGHT PANEL */}
      <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-[32px] border border-emerald-100/80 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,118,110,0.35)] ring-1 ring-emerald-100/70 sm:p-7">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {property?.title || "Property"}
          </h1>

          {property?.propertyCode && (
            <div className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-slate-900 ring-1 ring-emerald-200">
              Property ID:
              <span className="ml-2 font-mono text-emerald-700">
                {property.propertyCode}
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="text-3xl font-extrabold text-emerald-700">
              {money(property?.currency, property?.price)}
            </div>

            {showOffer && (
              <OfferBadge
                category={property?.offerCategory}
                active={property?.offerActive}
                label={property?.offerBadge || property?.offerTitle}
              />
            )}

            {isRent && showMonthlyRent && (
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                For Rent · Monthly{" "}
                {money(property?.currency, property?.monthlyRent)}
              </span>
            )}

            {showAdvance && (
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
                Booking Advance:{" "}
                {money(property?.currency, property?.advanceAmount)}
              </span>
            )}
          </div>

          <div className="mt-5 rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fffb_100%)] p-5 shadow-sm ring-1 ring-emerald-100/70">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Buyer Action Summary
                  </div>
                  <h3 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">
                    Main next step for this property
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1",
                      isAvailable
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : isReserved
                        ? "bg-amber-50 text-amber-800 ring-amber-200"
                        : "bg-rose-50 text-rose-800 ring-rose-200",
                    ].join(" ")}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {isAvailable
                      ? "Available to proceed"
                      : isReserved
                      ? "Temporarily reserved"
                      : "Currently booked"}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                    <BadgeCheck className="h-4 w-4 text-emerald-700" />
                    Verified listing
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                    <Phone className="h-4 w-4 text-emerald-700" />
                    Seller contact ready
                  </span>
                </div>

                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {isAvailable
                    ? "This property is open for buyer action. Start with a visit if you want to inspect first, or continue to reservation and payment from the action panel."
                    : isReserved
                    ? "This property is reserved right now. Your best next step is to contact the seller or send an inquiry while you monitor availability."
                    : "This property is already booked. You can still contact the seller for context or continue exploring similar options below."}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">
                <button
                  type="button"
                  onClick={isAvailable ? handleOpenSchedule : handleContactAgent}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold text-white transition",
                    isAvailable
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : isReserved
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-slate-900 hover:bg-slate-800",
                  ].join(" ")}
                >
                  <Calendar className="h-4 w-4" />
                  {isAvailable
                    ? "Primary CTA: Schedule Visit"
                    : isReserved
                    ? "Primary CTA: Contact Seller"
                    : "Primary CTA: Send Inquiry"}
                </button>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={handleContactAgent}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <Send className="h-4 w-4 text-emerald-700" />
                    Secondary: Inquiry
                  </button>

                  <button
                    type="button"
                    onClick={toggleWishlist}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <Heart className={["h-4 w-4", wishlisted ? "fill-rose-500 text-rose-500" : "text-emerald-700"].join(" ")} />
                    {wishlisted ? "Saved to wishlist" : "Secondary: Save property"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showOffer && (
            <div className="mt-4 rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.92)_0%,rgba(209,250,229,0.72)_100%)] p-5 ring-1 ring-emerald-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-emerald-900">
                    {property?.offerTitle || "Special Property Offer"}
                  </div>
                  {property?.offerDescription ? (
                    <div className="mt-2 max-w-2xl text-sm leading-6 text-emerald-900/80">
                      {property.offerDescription}
                    </div>
                  ) : null}
                </div>

                <OfferBadge
                  category={property?.offerCategory}
                  active={property?.offerActive}
                  label={property?.offerBadge || property?.offerTitle}
                />
              </div>

              {(offerDiscountText || offerExpiryText) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {offerDiscountText ? (
                    <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 ring-1 ring-emerald-200">
                      Discount: <span className="font-extrabold text-emerald-800">{offerDiscountText}</span>
                    </div>
                  ) : null}

                  {offerExpiryText ? (
                    <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 ring-1 ring-emerald-200">
                      Valid Until: <span className="font-extrabold text-emerald-800">{offerExpiryText}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {offerExpiryState ? (
                <div
                  className={[
                    "mt-3 text-xs font-semibold",
                    offerExpiryState.tone === "emerald"
                      ? "text-emerald-700"
                      : offerExpiryState.tone === "amber"
                      ? "text-amber-700"
                      : "text-rose-700",
                  ].join(" ")}
                >
                  {offerExpiryState.text}
                </div>
              ) : null}
            </div>
          )}

          {/* Chips */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
            {showBeds && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
                <BedDouble className="h-4 w-4 text-emerald-700" />
                {property?.beds} Beds
              </span>
            )}
            {showBaths && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
                <Bath className="h-4 w-4 text-emerald-700" />
                {property?.baths} Baths
              </span>
            )}
            {showSqft && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
                <Ruler className="h-4 w-4 text-emerald-700" />
                {property?.sqft} sqft
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
              <MapPin className="h-4 w-4 text-emerald-700" />
              {property?.address || property?.location || "Location"}
            </span>
          </div>

          {/* ✅ Google Map Card */}
          <div className="mt-6 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Location & Map
                  </div>
                  <div className="mt-2 text-lg font-extrabold text-slate-900">
                    Review the property location on Google Maps
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    Check the map preview below to understand the surrounding area, then open
                    Google Maps for directions and a more precise street-level view.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Map reference shared with this listing
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                    Use Open Map for live Google Maps directions
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={openGoogleMap}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-800"
              >
                <ExternalLink className="h-4 w-4" />
                Open Map
              </button>
            </div>

            {showGoogleMap ? (
              <>
                <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Shared map link / landmark
                  </div>
                  <div className="mt-2 break-all text-xs leading-6 text-slate-700">
                    {String(property?.landmark || "").trim()}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  If the embedded preview looks approximate, use{" "}
                  <span className="font-semibold text-slate-700">Open Map</span> to verify the
                  exact route directly in Google Maps.
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  {mapEmbedUrl && (
                    <iframe
                      title="map"
                      src={mapEmbedUrl}
                      className="h-[260px] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
                No Google Map provided. (We will open map by address/location.)
              </div>
            )}
          </div>

          {/* Listing Overview */}
          <div className="mt-6 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">
                Listing Overview
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {property?.propertyType || "—"} ·{" "}
                {property?.listingType || "—"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Price
                </div>
                <div className="mt-1 text-sm font-extrabold text-emerald-800">
                  {money(property?.currency, property?.price)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Booking Advance
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {showAdvance
                    ? money(property?.currency, property?.advanceAmount)
                    : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Location
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {property?.location || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Address
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {property?.address || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Furnishing
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.furnishing)
                    ? String(property.furnishing)
                    : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Facing
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.facing) ? String(property.facing) : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Floor
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.floor) ? property.floor : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Total Floors
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.totalFloors) ? property.totalFloors : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">
                  Year Built
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.yearBuilt) ? property.yearBuilt : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200 sm:col-span-2">
                <div className="text-xs font-semibold text-slate-500">
                  Road Access (ft)
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.roadAccessFt)
                    ? property.roadAccessFt
                    : "—"}
                </div>
              </div>
            </div>

            {/* rent info block */}
            {String(property?.listingType || "").toLowerCase() === "rent" &&
              (hasValue(property?.monthlyRent) ||
                hasValue(property?.deposit) ||
                hasValue(property?.availabilityDate)) && (
                <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="mb-3 text-sm font-extrabold text-emerald-900">
                    Rent Details
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-emerald-200">
                      <div className="text-xs font-semibold text-slate-500">
                        Monthly Rent
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">
                        {hasValue(property?.monthlyRent)
                          ? money(property?.currency, property?.monthlyRent)
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-emerald-200">
                      <div className="text-xs font-semibold text-slate-500">
                        Deposit
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">
                        {hasValue(property?.deposit)
                          ? money(property?.currency, property?.deposit)
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-emerald-200">
                      <div className="text-xs font-semibold text-slate-500">
                        Available From
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">
                        {hasValue(property?.availabilityDate)
                          ? String(property?.availabilityDate).slice(0, 10)
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">
                Description
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-700">
                {property?.description || "—"}
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="mt-6 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">
                Amenities
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {amenities.length} selected
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {AMENITIES.map((a) => {
                const enabled = amenities.includes(a);
                return (
                  <div
                    key={a}
                    className={[
                  "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-semibold ring-1",
                      enabled
                        ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                        : "bg-slate-50 text-slate-500 ring-slate-200",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        enabled ? "bg-emerald-600" : "bg-slate-300",
                      ].join(" ")}
                    />
                    {a}
                  </div>
                );
              })}
            </div>

            {amenities.length === 0 && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
                No amenities selected.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleOpenSchedule}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Schedule Visit
            </button>

            <button
              type="button"
              onClick={handleContactAgent}
              className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/5 hover:bg-emerald-50"
            >
              Inquiry
            </button>
          </div>

          {/* Similar properties */}
          <div className="mt-10 rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 ring-1 ring-emerald-100/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  More Options
                </div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  Similar properties worth reviewing next
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  These listings may be relevant because they are currently active and can help you
                  compare pricing, layout, and location before making a final decision.
                </p>
              </div>

              <div className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Suggested alternatives
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(similar.length ? similar : []).map((p) => {
              const img = getUniqueSimilarImage(p, new Set<string>());
              return (
                <a
                  key={p._id}
                  href={`/buyer/property/${p._id}`}
                  className="group overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_-28px_rgba(16,185,129,0.35)]"
                >
                  <img
                    src={img}
                    alt={p.title}
                    className="h-[170px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="p-4">
                    <div className="text-sm font-extrabold text-slate-900 line-clamp-1">
                      {p.title}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-emerald-700">
                      {(p.currency || "Rs")}{" "}
                      {Number(p.price || 0).toLocaleString()} · {p.beds || 0} Beds
                      · {p.baths || 0} Baths · {p.sqft || 0} sqft
                    </div>
                    <div className="mt-1 text-xs text-slate-600 line-clamp-1">
                      {p.address || p.location || ""}
                    </div>
                  </div>
                </a>
              );
            })}

            {similar.length === 0 && (
              <div className="rounded-[28px] bg-white p-5 text-sm text-slate-600 shadow-sm ring-1 ring-black/5">
                No similar properties found right now.
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Right sticky panel */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            {/* Contact Agent Card + Pay Advance + COD */}
            <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Contact Agent
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  Seller/Agent
                </span>
              </div>

              <div className="mt-4 rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Verified Contact
                    </div>
                    <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
                      {seller?.name || "Not provided"}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-500">
                      {seller?.role ? String(seller.role).replace(/^./, (c) => c.toUpperCase()) : "Seller / Agent"}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                    <BadgeCheck className="h-4 w-4" />
                    Verified seller
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-500">
                      Phone
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {seller?.phone || "Not provided"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-500">
                      Trust
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      Active agent profile
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Usually responds within a few hours
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {seller?.phone ? (
                  <a
                    href={`tel:${seller.phone}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4" />
                    Call Agent
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleContactAgent}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
                  >
                    Contact via Inquiry
                  </button>
                )}

                {/* ✅ KEEP: Pay Advance (unchanged logic) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isAvailable) return;
                    goToPayment();
                  }}
                  disabled={!isAvailable}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition",
                    isAvailable
                      ? "bg-emerald-900 hover:bg-emerald-950"
                      : isReserved
                      ? "bg-amber-500/80 cursor-not-allowed opacity-90"
                      : "bg-rose-600/80 cursor-not-allowed opacity-90",
                  ].join(" ")}
                >
                  <CreditCard className="h-4 w-4" />
                  {isAvailable
                    ? "Pay Advance (Online)"
                    : isReserved
                    ? "Reserved (Payment Locked)"
                    : "Booked (Payment Locked)"}
                </button>

                {/* ✅ NEW: Reserve with COD (functional) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isAvailable) return;
                    goToCOD();
                  }}
                  disabled={!isAvailable}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition ring-1",
                    isAvailable
                      ? "bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50"
                      : isReserved
                      ? "bg-amber-50 text-amber-900 ring-amber-200 cursor-not-allowed opacity-90"
                      : "bg-rose-50 text-rose-900 ring-rose-200 cursor-not-allowed opacity-90",
                  ].join(" ")}
                >
                  <Banknote className="h-4 w-4" />
                  {isAvailable ? "Reserve with COD (Pay Later)" : "COD Locked"}
                </button>

                {isReserved && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    🟡 This property is reserved
                    {reservedUntilText ? ` until ${reservedUntilText}` : ""}.
                    <div className="mt-1 text-xs text-amber-800/80">
                      Please try again later.
                    </div>
                  </div>
                )}

                {isBooked && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    🔴 This property has been booked (confirmed).
                    <div className="mt-1 text-xs text-rose-800/80">
                      Explore similar properties below.
                    </div>
                  </div>
                )}

                {/* ✅ Better copy (does not change logic) */}
                <p className="text-xs text-slate-500">
                  Online payment: reservation expires if payment is not completed
                  within 24 hours. COD: reservation must be confirmed in person
                  (shorter expiry).
                </p>

                {hasValue(property?.advanceAmount) && (
                  <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                    <div className="font-extrabold text-slate-900">
                      Advance Amount
                    </div>
                    <div className="mt-1">
                      {money(property?.currency, property?.advanceAmount)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry Card (KEEP) */}
            <div
              ref={inquiryRef}
              className="rounded-[28px] bg-white p-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
            >
              <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                Make an Inquiry
              </h3>

              {success && (
                <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800">
                    Your inquiry has been sent successfully! The seller will
                    contact you soon.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="+977 98XXXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Message *
                    </label>
                    <textarea
                      id="inquiry-message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="I'm interested in this property..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-r-2 border-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Inquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside>
      </section>

      {/* Schedule Visit Modal (KEEP) */}
      {openSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                Schedule a Visit
              </h3>
              <button
                type="button"
                onClick={() => setOpenSchedule(false)}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Request a visit for{" "}
              <span className="font-semibold text-slate-900">
                {property?.title}
              </span>
              .
            </p>

            {scheduleSuccess && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
                Visit request sent successfully!
              </div>
            )}

            {scheduleError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                {scheduleError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="date"
                    value={visitData.requestedDate}
                    onChange={(e) =>
                      setVisitData((p) => ({
                        ...p,
                        requestedDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Preferred Time
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="time"
                    value={visitData.preferredTime}
                    onChange={(e) =>
                      setVisitData((p) => ({
                        ...p,
                        preferredTime: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  value={visitData.message}
                  onChange={(e) =>
                    setVisitData((p) => ({ ...p, message: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Any note for the seller..."
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOpenSchedule(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitScheduleVisit}
                disabled={scheduleLoading}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scheduleLoading ? "Sending..." : "Request Visit"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const preview = searchParams?.get("preview") === "1";

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFatalError("");
        setLoading(true);

        const qs = preview ? "?preview=1" : "";
        const propertyResponse = await apiFetch<any>(
          `/properties/${params.id}${qs}`
        );

        const p =
          propertyResponse?.property ||
          propertyResponse?.data?.property ||
          propertyResponse?.data ||
          propertyResponse?.item ||
          propertyResponse;

        if (propertyResponse?.success === false) {
          setFatalError(propertyResponse?.message || "Property not found");
          setProperty(null);
          return;
        }

        if (p && (p._id || p.id)) {
          setProperty(p);
        } else {
          setFatalError("Property not found");
          setProperty(null);
        }
      } catch (err: any) {
        setFatalError(err?.message || "Failed to load data");
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) fetchData();
  }, [params?.id, preview]);

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center bg-[linear-gradient(180deg,#f4fff9_0%,#eefbf5_100%)] px-4">
        <div className="rounded-[28px] border border-emerald-100 bg-white px-10 py-12 text-center shadow-sm ring-1 ring-emerald-100">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (fatalError && !property) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center bg-[linear-gradient(180deg,#f4fff9_0%,#eefbf5_100%)] px-4">
        <div className="rounded-[28px] border border-rose-200 bg-white px-10 py-12 text-center shadow-sm ring-1 ring-rose-100">
          <p className="text-red-600">{fatalError}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <BuyerPropertyDetailsView property={property} paramsId={params?.id} />;
}
