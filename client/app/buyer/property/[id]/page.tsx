"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
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
  Share2,
  Home,
  Building2,
  Sofa,
  BadgeCheck,
  Phone,
  CreditCard,
} from "lucide-react";

const WISHLIST_KEY = "property-sewa:wishlist:v1";

function readWishlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeWishlist(ids: string[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

// ✅ helper: only show fields if value is real (not "", null, undefined, "0")
const hasValue = (v: any) =>
  v !== null &&
  v !== undefined &&
  String(v).trim() !== "" &&
  String(v).trim() !== "0";

// ✅ Reusable UI: seller मा जे field आउँछ, buyer detail मा पनि यही component ले देखाउँछ
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

  // ✅ Images (seller coverIndex logic: seller code sends cover first, so images[0] is cover)
  const images: string[] = useMemo(() => {
    const arr = (property?.images || []).map((x: any) => x?.url).filter(Boolean);
    if (arr.length > 0) return arr;
    return ["https://via.placeholder.com/1200x700?text=No+Image"];
  }, [property]);

  // ✅ Amenities safe reads (seller sends JSON string)
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

  // ✅ Seller contact (from backend: property.seller or propertyResponse.seller)
  const seller = property?.seller || null;

  // ✅ On first mount: set hero image
  useEffect(() => {
    const firstImg =
      images?.[0] || "https://via.placeholder.com/1200x700?text=No+Image";
    setActiveImg(firstImg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?._id]);

  // ✅ Auto fill user
  useEffect(() => {
    (async () => {
      try {
        const userResponse = await apiFetch<{ success: boolean; user: any }>(
          "/auth/me"
        );
        if (userResponse.success) {
          setFormData((prev) => ({
            ...prev,
            name: userResponse.user.name || "",
            email: userResponse.user.email || "",
          }));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // ✅ Similar properties
  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetch<{ success: boolean; items: any[] }>(
          "/properties?limit=12"
        );
        if (list.success) {
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
    const ids = readWishlist();
    const id = String(property._id);
    setWishlisted(Array.isArray(ids) ? ids.includes(id) : false);
  }, [property?._id]);

  const isRent = property?.listingType === "rent";

  // ✅ Wishlist toggle (localStorage)
  const toggleWishlist = () => {
    if (!property?._id) return;

    const id = String(property._id);
    const ids = readWishlist();

    if (ids.includes(id)) {
      const next = ids.filter((x) => x !== id);
      writeWishlist(next);
      setWishlisted(false);
    } else {
      const next = [id, ...ids].slice(0, 200);
      writeWishlist(next);
      setWishlisted(true);
    }
  };

  // ✅ Share
  const shareProperty = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `/buyer/property/${property?._id}`;

    const text = `${property?.title || "Property"} — ${property?.location || ""}`;

    try {
      if ((navigator as any)?.share) {
        await (navigator as any).share({
          title: property?.title || "Property",
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
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
      const response = await apiFetch<{ success: boolean; lead: any }>("/leads", {
        method: "POST",
        body: JSON.stringify({
          propertyId: property._id,
          ...formData,
        }),
      });

      if (response.success) {
        setSuccess(true);
        setFormData((prev) => ({ ...prev, message: "" }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Contact Agent works (scroll to inquiry)
  const handleContactAgent = () => {
    inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const textarea = document.getElementById(
        "inquiry-message"
      ) as HTMLTextAreaElement | null;
      textarea?.focus();
    }, 250);
  };

  // ✅ Schedule Visit modal open (KEEP)
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
        `Hi, I'd like to schedule a visit for "${property?.title || "this property"}".`,
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

      if (res.success) {
        setScheduleSuccess(true);
        setTimeout(() => setOpenSchedule(false), 900);
      } else {
        setScheduleError(res.message || "Failed to schedule visit.");
      }
    } catch (err: any) {
      setScheduleError(err.message || "Failed to schedule visit.");
    } finally {
      setScheduleLoading(false);
    }
  };

  function getUniqueSimilarImage(p: any, used: Set<string>) {
    const urls: string[] = (p?.images || []).map((x: any) => x?.url).filter(Boolean);
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

  // ✅ show flags (seller add-property fields)
  const showBeds = hasValue(property?.beds);
  const showBaths = hasValue(property?.baths);
  const showSqft = hasValue(property?.sqft);

  const showFurnishing = hasValue(property?.furnishing);
  const showYearBuilt = hasValue(property?.yearBuilt);
  const showFloor = hasValue(property?.floor);
  const showTotalFloors = hasValue(property?.totalFloors);
  const showFacing = hasValue(property?.facing);
  const showRoad = hasValue(property?.roadAccessFt);
  const showLandmark = hasValue(property?.landmark);

  const showAvailability = isRent && hasValue(property?.availabilityDate);
  const showMonthlyRent = isRent && hasValue(property?.monthlyRent);
  const showDeposit = isRent && hasValue(property?.deposit);

  const showExtraDetails =
    showFurnishing ||
    showYearBuilt ||
    showFloor ||
    showTotalFloors ||
    showFacing ||
    showRoad ||
    showLandmark ||
    showAvailability ||
    showDeposit;

  return (
    <main className="w-full min-w-0 px-6 py-8 sm:px-10">
      {/* top action buttons */}
      <div className="mb-4 flex justify-end gap-3">
        <button
          onClick={toggleWishlist}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition",
            wishlisted
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-emerald-700 text-white hover:bg-emerald-800",
          ].join(" ")}
        >
          <Heart className="h-4 w-4" />
          {wishlisted ? "Saved" : "Add to Wishlist"}
        </button>

        <button
          onClick={shareProperty}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* HERO */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <img
              src={activeImg || images[0]}
              alt={property?.title || "Property"}
              className="h-[420px] w-full object-cover"
            />

            <div className="absolute left-5 top-5 flex items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 ring-1 ring-black/10">
                {property?.status ? String(property.status).toUpperCase() : "FEATURED"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-semibold text-white ring-1 ring-emerald-700/40">
                <BadgeCheck className="h-4 w-4" />
                Verified
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent p-6">
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
                  "group overflow-hidden rounded-2xl bg-white ring-1 transition",
                  url === activeImg
                    ? "ring-emerald-500 shadow-md"
                    : "ring-black/10 hover:ring-emerald-300 hover:shadow-sm",
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

          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
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
        </div>
      </section>

      {/* DETAILS + RIGHT PANEL */}
      <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {property?.title || "Property"}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="text-3xl font-extrabold text-emerald-700">
              {property?.currency || "Rs"} {Number(property?.price || 0).toLocaleString()}
            </div>

            {/* ✅ Rent chip ONLY if rent + monthlyRent exists */}
            {isRent && showMonthlyRent && (
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                For Rent · Monthly {property.currency || "Rs"}{" "}
                {Number(property.monthlyRent || 0).toLocaleString()}
              </span>
            )}
          </div>

          {/* ✅ Chips ONLY if value exists */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
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

          {/* ✅ Listing Overview */}
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">
                Listing Overview
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {property?.propertyType || "—"} · {property?.listingType || "—"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Title</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {property?.title || "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Price</div>
                <div className="mt-1 text-sm font-extrabold text-emerald-800">
                  {property?.currency || "Rs"}{" "}
                  {Number(property?.price || 0).toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Location</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {property?.location || "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Address</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {property?.address || "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Beds</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.beds) ? property?.beds : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Baths</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.baths) ? property?.baths : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Sqft</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.sqft) ? property?.sqft : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Property Type</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {property?.propertyType ? String(property.propertyType) : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Listing Type</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {property?.listingType ? String(property.listingType) : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Furnishing</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.furnishing) ? property?.furnishing : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Year Built</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.yearBuilt) ? property?.yearBuilt : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Floor</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.floor) ? property?.floor : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Total Floors</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.totalFloors) ? property?.totalFloors : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Facing</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.facing) ? property?.facing : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Road Access (ft)</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.roadAccessFt) ? property?.roadAccessFt : "—"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:col-span-2">
                <div className="text-xs font-semibold text-slate-500">Landmark</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {hasValue(property?.landmark) ? property?.landmark : "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Description</div>
              <div className="mt-1 text-sm leading-6 text-slate-700">
                {property?.description || "—"}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {(property?.propertyType || property?.listingType) && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="text-sm font-extrabold text-slate-900">Property Info</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {property?.propertyType && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <Home className="h-4 w-4 text-emerald-700" />
                        Type
                      </span>
                      <span className="font-semibold capitalize">{property?.propertyType}</span>
                    </div>
                  )}
                  {property?.listingType && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-700" />
                        Listing
                      </span>
                      <span className="font-semibold capitalize">{property?.listingType}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showExtraDetails && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="text-sm font-extrabold text-slate-900">Extra Details</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {showFurnishing && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <Sofa className="h-4 w-4 text-emerald-700" />
                        Furnishing
                      </span>
                      <span className="font-semibold capitalize">{property.furnishing}</span>
                    </div>
                  )}
                  {showYearBuilt && (
                    <div className="flex items-center justify-between">
                      <span>Year Built</span>
                      <span className="font-semibold">{property.yearBuilt}</span>
                    </div>
                  )}
                  {showFloor && (
                    <div className="flex items-center justify-between">
                      <span>Floor</span>
                      <span className="font-semibold">{property.floor}</span>
                    </div>
                  )}
                  {showTotalFloors && (
                    <div className="flex items-center justify-between">
                      <span>Total Floors</span>
                      <span className="font-semibold">{property.totalFloors}</span>
                    </div>
                  )}
                  {showFacing && (
                    <div className="flex items-center justify-between">
                      <span>Facing</span>
                      <span className="font-semibold capitalize">{property.facing}</span>
                    </div>
                  )}
                  {showRoad && (
                    <div className="flex items-center justify-between">
                      <span>Road Access (ft)</span>
                      <span className="font-semibold">{property.roadAccessFt}</span>
                    </div>
                  )}
                  {showLandmark && (
                    <div className="flex items-center justify-between">
                      <span>Landmark</span>
                      <span className="font-semibold">{property.landmark}</span>
                    </div>
                  )}
                  {showAvailability && (
                    <div className="flex items-center justify-between">
                      <span>Available From</span>
                      <span className="font-semibold">{property.availabilityDate}</span>
                    </div>
                  )}
                  {showDeposit && (
                    <div className="flex items-center justify-between">
                      <span>Deposit</span>
                      <span className="font-semibold">
                        {property.currency || "Rs"}{" "}
                        {Number(property.deposit || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Amenities</div>
              <div className="text-xs font-semibold text-slate-500">
                {amenities.length} selected
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
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
              ].map((a) => {
                const enabled = amenities.includes(a);
                return (
                  <div
                    key={a}
                    className={[
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1",
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
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
                No amenities selected.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              onClick={handleOpenSchedule}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Schedule Visit
            </button>

            <button
              onClick={handleContactAgent}
              className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/5 hover:bg-emerald-50"
            >
              Inquiry
            </button>
          </div>

          {/* Similar properties */}
          <h3 className="mt-10 text-xl font-extrabold text-slate-900">Similar Properties</h3>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(similar.length ? similar : []).map((p) => {
              const img = getUniqueSimilarImage(p, usedSimilarImgs);
              return (
                <a
                  key={p._id}
                  href={`/buyer/property/${p._id}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
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
                      {(p.currency || "Rs")} {Number(p.price || 0).toLocaleString()} ·{" "}
                      {p.beds || 0} Beds · {p.baths || 0} Baths · {p.sqft || 0} sqft
                    </div>
                    <div className="mt-1 text-xs text-slate-600 line-clamp-1">
                      {p.address || p.location || ""}
                    </div>
                  </div>
                </a>
              );
            })}

            {similar.length === 0 && (
              <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 ring-1 ring-black/5">
                No similar properties found right now.
              </div>
            )}
          </div>
        </div>

        {/* Right sticky panel */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            {/* ✅ NEW: Contact Agent Card + Pay Advance */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">Contact Agent</h3>
                <span className="text-xs font-semibold text-slate-500">Seller/Agent</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Name</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {seller?.name || "Not provided"}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Phone</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {seller?.phone || "Not provided"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {seller?.phone ? (
                  <a
                    href={`tel:${seller.phone}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4" />
                    Call Agent
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleContactAgent}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
                  >
                    Contact via Inquiry
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => router.push(`/buyer/property/${property?._id}/payment`)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-950"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Advance
                </button>

                <p className="text-xs text-slate-500">
                  Reservation expires automatically if payment is not completed within 24 hours.
                </p>
              </div>
            </div>

            {/* Inquiry Card (KEEP) */}
            <div
              ref={inquiryRef}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                Make an Inquiry
              </h3>

              {success && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800">
                    Your inquiry has been sent successfully! The seller will contact you soon.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
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
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
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
                        setFormData((prev) => ({ ...prev, message: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="I'm interested in this property..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                onClick={() => setOpenSchedule(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={submitScheduleVisit}
                disabled={scheduleLoading}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {scheduleLoading ? "Sending..." : "Request Visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFatalError("");

        const propertyResponse = await apiFetch<{ success: boolean; property: any }>(
          `/properties/${params.id}`
        );

        if (propertyResponse.success) {
          setProperty(propertyResponse.property);
        } else {
          setFatalError("Property not found");
        }
      } catch (err: any) {
        setFatalError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-slate-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (fatalError && !property) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <p className="text-red-600">{fatalError}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <BuyerPropertyDetailsView property={property} paramsId={params.id} />;
}
