"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  getReservationExpiresAt,
  getReservationOwnerId,
  getReservationStatus,
  getReservationType,
} from "@/app/lib/propertyReservation";
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
  Banknote,
  Share2,
  Scale,
  ChevronLeft,
  ChevronRight,
  Building2,
  CarFront,
  CheckCircle2,
  School,
  Hospital,
  ShoppingBag,
  Droplets,
  Zap,
  Shield,
  ArrowUpDown,
  Wifi,
  Wind,
  Trees,
  Dumbbell,
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

const NEARBY_ITEMS = [
  { key: "nearby", label: "Nearby", icon: MapPin },
  { key: "school", label: "School", icon: School },
  { key: "hospital", label: "Hospital", icon: Hospital },
  { key: "supermarket", label: "Supermarket", icon: ShoppingBag },
] as const;

const AMENITY_ICON_MAP: Record<string, any> = {
  Parking: CarFront,
  Water: Droplets,
  "Electricity Backup": Zap,
  Security: Shield,
  Lift: Building2,
  Wifi: Wifi,
  AC: Wind,
  Balcony: Building2,
  Garden: Trees,
  Gym: Dumbbell,
};

const hasValue = (v: any) =>
  v !== null &&
  v !== undefined &&
  String(v).trim() !== "" &&
  String(v).trim() !== "0";

function money(currency: string | undefined, value: any) {
  const c = currency || "Rs";
  const n = Number(value || 0);
  return `${c} ${n.toLocaleString()}`;
}

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

function extractLatLngFromGoogleUrl(url: string) {
  const m = url.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
  if (!m) return null;
  return { lat: m[1], lng: m[3] };
}

type Availability = "available" | "reserved" | "booked";

function getAvailability(p: any): Availability {
  const status = getReservationStatus(p);
  if (status === "paid") return "booked";
  if (status === "active") return "reserved";
  return "available";
}

function formatReservedUntil(p: any) {
  const date = getReservationExpiresAt(p);
  if (!date || date.getTime() <= Date.now()) return "";
  return date.toLocaleString();
}

function formatOfferDiscount(p: any) {
  const type = String(p?.offerDiscountType || "none").toLowerCase();
  const value = Number(p?.offerDiscountValue || 0);
  if (!value || value <= 0) return "";
  if (type === "percentage") return `${value}% off`;
  if (type === "fixed")
    return `${p?.currency || "Rs"} ${value.toLocaleString()} off`;
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
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const diffDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

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

type ToastState = { show: boolean; text: string };
type PropertyVisitStatus = {
  _id: string;
  status: "requested" | "confirmed" | "rescheduled" | "rejected" | "cancelled" | "completed" | "no_show";
  preferredDate?: string;
  preferredTimeSlot?: string;
  actualDate?: string;
  actualTime?: string;
  sellerNote?: string;
};

function Toast({ show, text }: ToastState) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-emerald-600/95 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-emerald-300/50">
        {text}
      </div>
    </div>
  );
}

function BuyerPropertyDetailsView({
  property,
  paramsId,
}: {
  property: any;
  paramsId: any;
}) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [meId, setMeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [activeImg, setActiveImg] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState(0);

  const [similar, setSimilar] = useState<any[]>([]);
  const [wishlisted, setWishlisted] = useState(false);
  const [agentImageFailed, setAgentImageFailed] = useState(false);

  const inquiryRef = useRef<HTMLDivElement | null>(null);

  const [openSchedule, setOpenSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });

  const [visitData, setVisitData] = useState({
    visitType: "in_person",
    requestedDate: "",
    preferredTime: "",
    message: "",
  });
  const [visitStatus, setVisitStatus] = useState<PropertyVisitStatus | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (text: string) => {
    setToast({ show: true, text });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1300);
  };

  const images: string[] = useMemo(() => {
    const arr = (property?.images || []).map((x: any) => x?.url).filter(Boolean);
    if (arr.length > 0) return arr;
    return ["https://via.placeholder.com/1200x700?text=No+Image"];
  }, [property]);

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

  const seller =
    property?.seller || property?.createdBy || property?.owner || null;
  const sellerRoleText = seller?.role
    ? String(seller.role).replace(/^./, (c) => c.toUpperCase())
    : "Senior Property Agent";
  const agentImageSrc = "/agents/baiju.jpg";
  const sellerInitials = String(seller?.name || "Agent")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AG";

  const availability = useMemo(() => getAvailability(property), [property]);
  const reservationType = useMemo(() => getReservationType(property), [property]);
  const reservationOwnerId = useMemo(() => getReservationOwnerId(property), [property]);
  const reservedUntilText = useMemo(
    () => formatReservedUntil(property),
    [property]
  );
  const isAvailable = availability === "available";
  const isReserved = availability === "reserved";
  const isBooked = availability === "booked";
  const isReservedByMe = !!meId && reservationOwnerId === meId;
  const showCompleteAdvancePayment = isReserved && isReservedByMe && reservationType === "COD";

  useEffect(() => {
    const firstImg =
      images?.[0] || "https://via.placeholder.com/1200x700?text=No+Image";
    setActiveImg(firstImg);
    setActiveIndex(0);
  }, [property?._id, images]);

  useEffect(() => {
    (async () => {
      try {
        const userResponse = await apiFetch<{ success: boolean; user: any }>(
          "/auth/me"
        );
        if (userResponse?.success) {
          setMeId(String(userResponse?.user?._id || userResponse?.user?.id || ""));
          setFormData((prev) => ({
            ...prev,
            name: userResponse?.user?.name || "",
            email: userResponse?.user?.email || "",
            phone: userResponse?.user?.phone || prev.phone || "",
          }));
        }
      } catch {
        //
      }
    })();
  }, []);

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

          setSimilar([...withImages, ...withoutImages].slice(0, 4));
        }
      } catch {
        //
      }
    })();
  }, [paramsId]);

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

  useEffect(() => {
    setAgentImageFailed(false);
  }, [property?._id]);

  useEffect(() => {
    if (!property?._id) return;
    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; visit: PropertyVisitStatus | null }>(
          `/api/visits/property/${property._id}/status`
        );
        setVisitStatus(res?.visit || null);
      } catch {
        setVisitStatus(null);
      }
    })();
  }, [property?._id]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const listingType = String(property?.listingType || "").toLowerCase();
  const isRent = listingType === "rent";

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
      //
    }
  };

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
        showToast("Inquiry sent successfully");
      } else {
        setError("Failed to send inquiry");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactAgent = () => {
    inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const textarea = document.getElementById(
        "inquiry-message"
      ) as HTMLTextAreaElement | null;
      textarea?.focus();
    }, 250);
  };

  const handleOpenSchedule = () => {
    setScheduleError("");
    setScheduleSuccess(false);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultDate = `${yyyy}-${mm}-${dd}`;

    setVisitData((prev) => ({
      visitType: prev.visitType,
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
            visitType: visitData.visitType,
            preferredDate: visitData.requestedDate,
            preferredTimeSlot: visitData.preferredTime,
            buyerMessage: visitData.message,
          }),
        }
      );

      if (res?.success) {
        setScheduleSuccess(true);
        showToast("Visit scheduled successfully");
        try {
          const statusRes = await apiFetch<{ success: boolean; visit: PropertyVisitStatus | null }>(
            `/api/visits/property/${property._id}/status`
          );
          setVisitStatus(statusRes?.visit || null);
        } catch {}
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

  const showBeds = hasValue(property?.beds);
  const showBaths = hasValue(property?.baths);
  const showSqft = hasValue(property?.sqft);
  const showParking = hasValue(property?.parkingSpaces);

  const showGoogleMap = hasValue(property?.landmark);
  const googleMapRaw = String(property?.landmark || "").trim();

  const mapCoords = isLatLng(googleMapRaw)
    ? parseLatLng(googleMapRaw)
    : googleMapRaw.startsWith("http")
    ? extractLatLngFromGoogleUrl(googleMapRaw)
    : null;

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
  const offerExpiryText = useMemo(
    () => formatOfferExpiry(property?.offerValidUntil),
    [property?.offerValidUntil]
  );
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

  const goToPayment = () => {
    if (!property?._id) return;
    router.push(`/buyer/property/${property._id}/payment`);
  };

  const goToCOD = () => {
    if (!property?._id) return;
    router.push(`/buyer/property/${property._id}/advance-payment`);
  };

  const handleShare = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const title = property?.title || "Property";
      const text = `${title} - ${property?.location || property?.address || ""}`;

      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert("Property link copied to clipboard");
        return;
      }

      window.prompt("Copy this link:", url);
    } catch {
      //
    }
  };

  const handleCompare = () => {
    try {
      if (!property?._id) return;
      const key = "property-sewa:compare:v1";
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      const current = Array.isArray(parsed?.ids)
        ? parsed.ids.filter((value: unknown): value is string => typeof value === "string")
        : [];
      const propertyId = String(property._id);
      const next = current.includes(propertyId) ? current : [propertyId, ...current];
      localStorage.setItem(key, JSON.stringify({ ids: next.slice(0, 2) }));
      router.push("/buyer/compare");
    } catch {
      router.push("/buyer/compare");
    }
  };

  const goPrevImage = () => {
    if (!images.length) return;
    const nextIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1;
    setActiveIndex(nextIndex);
    setActiveImg(images[nextIndex]);
  };

  const goNextImage = () => {
    if (!images.length) return;
    const nextIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(nextIndex);
    setActiveImg(images[nextIndex]);
  };

  const statusLabel =
    String(property?.status || "").trim() ||
    (listingType === "rent" ? "For Rent" : "For Sale");

  const amenityDisplay = amenities.length ? amenities : [];
  const propertyTypeLabel =
    String(property?.propertyType || property?.type || property?.category || "Property").trim() ||
    "Property";
  const locationText = property?.address || property?.location || "Location not provided";
  const fullAddressText =
    [property?.address, property?.location].filter(Boolean).join(", ") || "Location not provided";
  const keyFacts = [
    showBeds ? { label: "Bedrooms", value: `${property?.beds} bd`, icon: BedDouble } : null,
    showBaths ? { label: "Bathrooms", value: `${property?.baths} ba`, icon: Bath } : null,
    showSqft ? { label: "Area", value: `${property?.sqft} sqft`, icon: Ruler } : null,
    { label: "Property Type", value: propertyTypeLabel, icon: Building2 },
    showParking
      ? { label: "Parking", value: `${property?.parkingSpaces} spaces`, icon: CarFront }
      : null,
    { label: "Status", value: statusLabel, icon: ShieldCheck },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: any }>;
  const highlightItems = [
    showOffer && offerDiscountText ? `Offer available: ${offerDiscountText}` : null,
    showAdvance ? `Advance payment: ${money(property?.advanceAmount, property?.currency)}` : null,
    showMonthlyRent ? `Monthly rent: ${money(property?.monthlyRent, property?.currency)}` : null,
    showDeposit ? `Security deposit: ${money(property?.deposit, property?.currency)}` : null,
    showAvailability && property?.availabilityDate
      ? `Available from: ${String(property?.availabilityDate)}`
      : null,
    isReserved && reservedUntilText ? `Reserved until ${reservedUntilText}` : null,
    isBooked ? "Reservation completed for this listing" : null,
    property?.furnishingStatus ? `Furnishing: ${property.furnishingStatus}` : null,
  ].filter(Boolean) as string[];

  const usedSimilarImgs = new Set<string>();
  if (activeImg) usedSimilarImgs.add(activeImg);

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 sm:px-6 lg:px-8">
      <Toast show={toast.show} text={toast.text} />
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-6 w-6 text-emerald-700" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              Property Details
            </h1>
          </div>

          <AdActionsMenu
            adId={property?._id}
            title={property?.title}
            location={property?.location || property?.address}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img
              src={activeImg || images[0]}
              alt={property?.title || "Property"}
              className="h-[280px] w-full object-cover sm:h-[420px] lg:h-[520px]"
            />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-5 sm:top-5">
              <span className="rounded-md bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                {statusLabel}
              </span>

              <span className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                Verified
              </span>

              {isAvailable && (
                <span className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Available
                </span>
              )}
              {isReserved && (
                <span className="rounded-md bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Reserved
                </span>
              )}
              {isBooked && (
                <span className="rounded-md bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Booked
                </span>
              )}

              {showOffer && (
                <OfferBadge
                  category={property?.offerCategory}
                  active={property?.offerActive}
                  label={property?.offerBadge || property?.offerTitle}
                />
              )}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={goNextImage}
                  className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-16 sm:px-6 sm:pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-white sm:text-5xl">
                    {money(property?.currency, property?.price)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-white/90 sm:text-lg">
                    <MapPin className="h-4 w-4" />
                    <span>{property?.address || property?.location || "Location"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const first = document.getElementById("property-thumbnails");
                    first?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700 sm:self-auto"
                >
                  View All Photos
                </button>
              </div>
            </div>
          </div>

          <div
            id="property-thumbnails"
            className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5"
          >
            {images.slice(0, 5).map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveImg(url);
                  setActiveIndex(idx);
                }}
                className={[
                  "overflow-hidden rounded-lg border bg-white transition",
                  url === activeImg
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-slate-200 hover:border-slate-300",
                ].join(" ")}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-24 w-full object-cover sm:h-28"
                />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-slate-700">
              <BedDouble className="h-5 w-5 text-slate-600" />
              <span>{showBeds ? property?.beds : 0} Beds</span>
            </div>

            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-slate-700">
              <Bath className="h-5 w-5 text-slate-600" />
              <span>{showBaths ? property?.baths : 0} Baths</span>
            </div>

            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-slate-700">
              <Ruler className="h-5 w-5 text-slate-600" />
              <span>{showSqft ? property?.sqft : 0} Sq. Ft.</span>
            </div>

            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-slate-700">
              <CarFront className="h-5 w-5 text-slate-600" />
              <span>{showParking ? property?.parkingSpaces : 1} Parking</span>
            </div>

            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-slate-700">
              <Building2 className="h-5 w-5 text-slate-600" />
              <span>{property?.propertyType || "Property"}</span>
            </div>
          </div>
        </section>

        <section className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={toggleWishlist}
            className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Heart
              className={[
                "h-5 w-5",
                wishlisted ? "fill-rose-500 text-rose-500" : "text-slate-700",
              ].join(" ")}
            />
            {wishlisted ? "Saved" : "Save"}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Share2 className="h-5 w-5 text-emerald-700" />
            Share
          </button>

          <button
            type="button"
            onClick={handleCompare}
            className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Scale className="h-5 w-5 text-slate-700" />
            Compare
          </button>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Property Description
                </h2>
              </div>

              <div className="px-5 py-5">
                <p className="text-base leading-8 text-slate-700">
                  {property?.description ||
                    "Beautiful property with modern interiors and a comfortable living experience."}
                </p>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <div className="space-y-3 text-sm font-semibold text-slate-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <span>
                        Prime location in {property?.location || "Kathmandu"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <span>24/7 water & electricity support</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <span>Close to schools, market and daily essentials</span>
                    </div>
                  </div>
                </div>

                {(showOffer || showAdvance || showMonthlyRent || showDeposit || showAvailability) && (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {showOffer && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <div className="text-sm font-extrabold text-emerald-900">
                          {property?.offerTitle || "Special Offer"}
                        </div>
                        {offerDiscountText ? (
                          <div className="mt-1 text-sm font-semibold text-emerald-800">
                            Discount: {offerDiscountText}
                          </div>
                        ) : null}
                        {offerExpiryText ? (
                          <div className="mt-1 text-sm text-emerald-900/80">
                            Valid until: {offerExpiryText}
                          </div>
                        ) : null}
                        {offerExpiryState ? (
                          <div
                            className={[
                              "mt-1 text-xs font-bold",
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

                    {showAdvance && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-bold text-slate-500">
                          Booking Advance
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-slate-900">
                          {money(property?.currency, property?.advanceAmount)}
                        </div>
                      </div>
                    )}

                    {showMonthlyRent && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-bold text-slate-500">
                          Monthly Rent
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-slate-900">
                          {money(property?.currency, property?.monthlyRent)}
                        </div>
                      </div>
                    )}

                    {showDeposit && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-bold text-slate-500">
                          Deposit
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-slate-900">
                          {money(property?.currency, property?.deposit)}
                        </div>
                      </div>
                    )}

                    {showAvailability && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-bold text-slate-500">
                          Available From
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-slate-900">
                          {String(property?.availabilityDate).slice(0, 10)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Amenities & Features
                </h2>
              </div>

              <div className="px-5 py-5">
                {amenityDisplay.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {AMENITIES.map((a) => {
                      const enabled = amenities.includes(a);
                      const Icon = AMENITY_ICON_MAP[a] || CheckCircle2;

                      return (
                        <div
                          key={a}
                          className={[
                            "flex flex-col items-center justify-center rounded-lg border p-4 text-center transition",
                            enabled
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-slate-50 text-slate-400",
                          ].join(" ")}
                        >
                          <Icon
                            className={[
                              "mb-2 h-6 w-6",
                              enabled ? "text-emerald-700" : "text-slate-400",
                            ].join(" ")}
                          />
                          <div className="text-sm font-bold">{a}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No amenities selected.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Location
                </h2>
              </div>

              <div className="px-5 py-5">
                {showGoogleMap ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      {mapEmbedUrl && (
                        <iframe
                          title="map"
                          src={mapEmbedUrl}
                          className="h-[280px] w-full"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <MapPin className="h-4 w-4 text-emerald-700" />
                        <span>Nearby Places</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {NEARBY_ITEMS.map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.key}
                              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                            >
                              <Icon className="h-5 w-5 text-emerald-700" />
                              <span className="text-sm font-semibold text-slate-700">
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={openGoogleMap}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Google Map
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No Google Map provided. We will use address/location for direction search.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Similar Properties
                </h2>
              </div>

              <div className="px-5 py-5">
                {similar.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {similar.map((p) => {
                      const img = getUniqueSimilarImage(p, usedSimilarImgs);
                      return (
                        <a
                          key={p._id}
                          href={`/buyer/property/${p._id}`}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                        >
                          <img
                            src={img}
                            alt={p.title}
                            className="h-44 w-full object-cover"
                          />
                          <div className="p-3">
                            <div className="line-clamp-1 text-base font-extrabold text-slate-800">
                              {p.title}
                            </div>
                            <div className="mt-1 line-clamp-1 text-sm text-slate-500">
                              {p.address || p.location || ""}
                            </div>
                            <div className="mt-2 text-sm font-bold text-emerald-700">
                              {(p.currency || "Rs")}{" "}
                              {Number(p.price || 0).toLocaleString()}
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No similar properties found right now.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Contact Agent
                </h2>
              </div>

              <div className="px-5 py-5">
                <div className="rounded-xl border border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#f1f9f4_100%)] p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
                      {agentImageFailed ? (
                        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#34d399_0%,#10b981_32%,#065f46_100%)]">
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_48%,rgba(255,255,255,0.08)_100%)]" />
                          <div className="absolute right-2 top-2 rounded-full bg-white/18 p-1.5 backdrop-blur-sm">
                            <Building2 className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="relative text-2xl font-black tracking-[0.18em] text-white drop-shadow-sm">
                            {sellerInitials}
                          </div>
                        </div>
                      ) : (
                        <Image
                          src={agentImageSrc}
                          alt={seller?.name || "Agent"}
                          fill
                          sizes="96px"
                          className="object-cover"
                          onError={() => setAgentImageFailed(true)}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xl font-extrabold text-slate-800">
                          {seller?.name || "Agent not provided"}
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      </div>

                      <div className="mt-1 text-sm font-semibold text-slate-600">
                        {sellerRoleText}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-white bg-white/90 px-3 py-2">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                            Trust
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-slate-800">
                            Identity reviewed
                          </div>
                        </div>

                        <div className="rounded-lg border border-white bg-white/90 px-3 py-2">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            Verification
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-slate-800">
                            Active seller profile
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-2xl font-extrabold text-slate-800">
                    <Phone className="h-5 w-5 text-emerald-700" />
                    <span>{seller?.phone || "Not provided"}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {seller?.phone ? (
                    <a
                      href={`tel:${seller.phone}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-800"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleContactAgent}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Send Message
                  </button>

                  <button
                    type="button"
                    onClick={handleContactAgent}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-[#2e7d32] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#27692a]"
                  >
                    Contact Agent
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {visitStatus && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <div className="font-extrabold capitalize">Visit {visitStatus.status}</div>
                      <div className="mt-1">
                        {new Date(visitStatus.actualDate || visitStatus.preferredDate || Date.now()).toLocaleDateString()}{" "}
                        at {visitStatus.actualTime || visitStatus.preferredTimeSlot || "time pending"}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAvailable && !showCompleteAdvancePayment) return;
                      goToPayment();
                    }}
                    disabled={!isAvailable && !showCompleteAdvancePayment}
                    className={[
                      "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-extrabold text-white transition",
                      isAvailable || showCompleteAdvancePayment
                        ? "bg-slate-900 hover:bg-black"
                        : isReserved
                        ? "cursor-not-allowed bg-amber-500/80"
                        : "cursor-not-allowed bg-rose-600/80",
                    ].join(" ")}
                  >
                    <CreditCard className="h-4 w-4" />
                    {showCompleteAdvancePayment
                      ? "Complete Advance Payment"
                      : isAvailable
                      ? "Pay Advance (Online)"
                      : isReserved
                      ? "Reserved (Payment Locked)"
                      : "Booked (Payment Locked)"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isAvailable) return;
                      goToCOD();
                    }}
                    disabled={!isAvailable}
                    className={[
                      "inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-extrabold transition",
                      isAvailable
                        ? "border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50"
                        : isReserved
                        ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-800"
                        : "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-800",
                    ].join(" ")}
                  >
                    <Banknote className="h-4 w-4" />
                    {isAvailable ? "Reserve with COD (Pay Later)" : "COD Locked"}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSchedule}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule Visit
                  </button>
                </div>

                {(isReserved || isBooked) && (
                  <div
                    className={[
                      "mt-4 rounded-xl border p-4 text-sm",
                      isReserved
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-rose-200 bg-rose-50 text-rose-900",
                    ].join(" ")}
                  >
                    {isReserved ? (
                      <>
                        <div className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <div className="font-extrabold">
                              Reservation currently active
                            </div>
                            <div className="mt-1">
                              This property is reserved
                              {reservedUntilText ? ` until ${reservedUntilText}` : ""}.
                              {showCompleteAdvancePayment
                                ? " You can still complete the advance payment during this 1-hour hold."
                                : " Payment and COD actions remain locked until the hold ends."}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <div className="font-extrabold">Reservation completed</div>
                          <div className="mt-1">
                            This property has already been booked. You can still
                            contact the agent for clarification or explore alternatives.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  COD and advance reservations stay active for 1 hour. If payment is not completed
                  in time, the reservation expires automatically and the property becomes available
                  again.
                </div>
              </div>
            </div>

            <div
              ref={inquiryRef}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Make an Inquiry
                </h2>
              </div>

              <div className="px-5 py-5">
                {success && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-800">
                      Your inquiry has been sent successfully! The seller will contact you soon.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-800">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="I'm interested in this property..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                </form>
              </div>
            </div>
          </aside>
        </section>

        {openSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-slate-900">
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

              <p className="mt-2 text-sm text-slate-600">
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
                    Visit Type
                  </label>
                  <select
                    value={visitData.visitType}
                    onChange={(e) =>
                      setVisitData((p) => ({
                        ...p,
                        visitType: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="in_person">In Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="site_tour">Site Tour</option>
                  </select>
                </div>
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
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitScheduleVisit}
                  disabled={scheduleLoading}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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

function PropertyDetailsPageContent() {
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
      <div className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#f5f7fb] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (fatalError && !property) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#f5f7fb] px-4">
        <div className="rounded-2xl border border-rose-200 bg-white px-10 py-12 text-center shadow-sm">
          <p className="text-red-600">{fatalError}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <BuyerPropertyDetailsView property={property} paramsId={params?.id} />;
}

export default function PropertyDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PropertyDetailsPageContent />
    </Suspense>
  );
}
