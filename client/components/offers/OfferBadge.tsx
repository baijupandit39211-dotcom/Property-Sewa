"use client";

type OfferCategory = "dashain" | "latest" | "hot" | "limited_time";

type Props = {
  category?: "none" | OfferCategory | null;
  active?: boolean;
  label?: string | null;
  className?: string;
};

function getStyles(category: OfferCategory) {
  if (category === "dashain") {
    return "bg-[#0D1C12]/90 text-white ring-[#D1D5DB]/35";
  }
  if (category === "hot") {
    return "bg-rose-500/90 text-white ring-rose-200/35";
  }
  if (category === "latest") {
    return "bg-[#316249]/92 text-white ring-[#D1D5DB]/35";
  }
  return "bg-amber-400/95 text-[#0D1C12] ring-amber-100/40";
}

function getDefaultLabel(category: OfferCategory) {
  if (category === "dashain") return "Dashain Offer";
  if (category === "hot") return "Hot Deal";
  if (category === "latest") return "Latest Deal";
  return "Limited Time";
}

function normalizeLabel(label: string | null | undefined, category: OfferCategory) {
  const raw = String(label || "").trim();
  if (!raw) return getDefaultLabel(category);

  const compact = raw.replace(/\s+/g, " ").trim();
  const hasPercent = /\d+(\.\d+)?\s*%/.test(compact);
  const hasOffWord = /\bOFF\b/i.test(compact);

  if (hasPercent) {
    if (hasOffWord) {
      return compact.replace(/\bOFF\b/gi, "OFF").replace(/\s+/g, " ").trim();
    }
    return `${compact} OFF`;
  }

  return compact;
}

export default function OfferBadge({
  category,
  active,
  label,
  className = "",
}: Props) {
  if (!active || !category || category === "none") return null;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] ring-1 backdrop-blur-sm",
        getStyles(category),
        className,
      ].join(" ")}
    >
      {normalizeLabel(label, category)}
    </span>
  );
}
