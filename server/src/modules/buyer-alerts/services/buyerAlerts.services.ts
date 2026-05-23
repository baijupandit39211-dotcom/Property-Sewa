import { randomUUID } from "crypto";
import BuyerAlertState from "../../../models/BuyerAlertState.model";
import Property from "../../../models/Property.model";
import Visit from "../../../models/Visit.model";
import Wishlist from "../../../models/Wishlist.model";

type Preferences = {
  alertsEnabled: boolean;
  visitsEnabled: boolean;
  offersEnabled: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  alertsEnabled: true,
  visitsEnabled: true,
  offersEnabled: true,
};

async function ensureState(userId: string) {
  let state = await BuyerAlertState.findOne({ userId });
  if (!state) {
    state = await BuyerAlertState.create({ userId, preferences: DEFAULT_PREFERENCES, rules: [], items: [] });
  }
  return state;
}

function normalizeRule(input: any) {
  return {
    id: String(input?.id || randomUUID()),
    name: String(input?.name || "My Alert").trim().slice(0, 140),
    enabled: input?.enabled !== false,
    query: String(input?.query || "").trim(),
    location: String(input?.location || "").trim(),
    maxPrice: input?.maxPrice ? Number(input.maxPrice) : null,
    minBeds: input?.minBeds ? Number(input.minBeds) : null,
    minBaths: input?.minBaths ? Number(input.minBaths) : null,
    minSqft: input?.minSqft ? Number(input.minSqft) : null,
    createdAt: input?.createdAt ? new Date(input.createdAt) : new Date(),
  };
}

function matchRule(property: any, rule: any) {
  const title = String(property?.title || "").toLowerCase();
  const location = String(property?.location || property?.address || "").toLowerCase();
  const price = Number(property?.price || 0);
  const beds = Number(property?.beds || 0);
  const baths = Number(property?.baths || 0);
  const sqft = Number(property?.sqft || 0);

  if (rule.query && !(`${title} ${location}`.includes(String(rule.query).toLowerCase()))) return false;
  if (rule.location && !location.includes(String(rule.location).toLowerCase())) return false;
  if (rule.maxPrice && price > Number(rule.maxPrice)) return false;
  if (rule.minBeds && beds < Number(rule.minBeds)) return false;
  if (rule.minBaths && baths < Number(rule.minBaths)) return false;
  if (rule.minSqft && sqft < Number(rule.minSqft)) return false;

  return true;
}

async function syncSystemAlerts(userId: string) {
  const state = await ensureState(userId);
  const now = new Date();
  const existing = Array.isArray(state.items) ? state.items : [];
  const itemMap = new Map(existing.map((item: any) => [String(item.id), item]));

  const [rules, visits, wishlists] = await Promise.all([
    Promise.resolve(Array.isArray(state.rules) ? state.rules : []),
    Visit.find({ buyerId: userId }).sort({ createdAt: -1 }).limit(30).populate({ path: "propertyId", select: "title location images" }).lean(),
    Wishlist.find({ buyerId: userId }).select("propertyId").lean(),
  ]);

  const ruleItems: any[] = [];
  const properties = await Property.find({ status: "approved" }).sort({ createdAt: -1 }).limit(100).lean();
  for (const rule of rules.filter((r: any) => r.enabled !== false)) {
    for (const property of properties.slice(0, 15)) {
      if (!matchRule(property, rule)) continue;
      const propertyId = String(property._id);
      const id = `rule:${rule.id}:${propertyId}`;
      if (itemMap.has(id)) continue;
      ruleItems.push({
        id,
        type: "alerts",
        title: "Matching property found",
        message: `${property.title || "Property"} - ${property.location || "Location"}`,
        ctaLabel: "View Property",
        href: `/buyer/property/${propertyId}`,
        imageUrl: String(property?.images?.[0]?.url || ""),
        createdAt: now,
        isRead: false,
      });
    }
  }

  const visitItems: any[] = [];
  for (const visit of visits.slice(0, 10)) {
    const id = `visit:${String(visit._id)}`;
    if (itemMap.has(id)) continue;
    visitItems.push({
      id,
      type: "visits",
      title: "Visit update",
      message: `Your visit status is ${String(visit.status || "requested")}.`,
      ctaLabel: "View Visit Details",
      href: "/buyer/scheduled-visits",
      imageUrl: String((visit as any)?.propertyId?.images?.[0]?.url || ""),
      createdAt: visit.updatedAt || visit.createdAt || now,
      isRead: false,
    });
  }

  const wishlistPropertyIds = wishlists.map((row: any) => String(row.propertyId || "")).filter(Boolean);
  const offerProps = wishlistPropertyIds.length
    ? await Property.find({
        _id: { $in: wishlistPropertyIds },
        status: "approved",
        offerActive: true,
        $or: [{ offerValidUntil: null }, { offerValidUntil: { $gte: now } }],
      })
        .select("title location images offerTitle offerBadge")
        .lean()
    : [];

  const offerItems: any[] = [];
  for (const property of offerProps) {
    const propertyId = String(property._id);
    const id = `offer:${propertyId}`;
    if (itemMap.has(id)) continue;
    offerItems.push({
      id,
      type: "offers",
      title: "Offer available on your wishlisted property",
      message: `${property.offerBadge || property.offerTitle || "Special offer"} - ${property.title}`,
      ctaLabel: "View Offer",
      href: `/buyer/property/${propertyId}`,
      imageUrl: String((property as any)?.images?.[0]?.url || ""),
      createdAt: now,
      isRead: false,
    });
  }

  state.items = [...existing, ...ruleItems, ...visitItems, ...offerItems]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 300);
  state.lastOfferSyncAt = now;
  await state.save();

  return state;
}

async function getFeed(userId: string) {
  const state = await syncSystemAlerts(userId);
  return {
    preferences: state.preferences || DEFAULT_PREFERENCES,
    rules: state.rules || [],
    items: (state.items || []).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
}

async function updatePreferences(userId: string, preferences: Partial<Preferences>) {
  const state = await ensureState(userId);
  state.preferences = {
    ...(state.preferences || DEFAULT_PREFERENCES),
    ...(preferences || {}),
  } as any;
  await state.save();
  return state.preferences;
}

async function createRule(userId: string, input: any) {
  const state = await ensureState(userId);
  const rule = normalizeRule(input);
  state.rules = [rule as any, ...(state.rules || [])] as any;
  await state.save();
  return rule;
}

async function updateRule(userId: string, ruleId: string, input: any) {
  const state = await ensureState(userId);
  const nextRules = (state.rules || []).map((rule: any) =>
    String(rule.id) === String(ruleId) ? { ...normalizeRule({ ...rule, ...input, id: rule.id }) } : rule
  );
  state.rules = nextRules as any;
  await state.save();
  return (state.rules || []).find((rule: any) => String(rule.id) === String(ruleId)) || null;
}

async function deleteRule(userId: string, ruleId: string) {
  const state = await ensureState(userId);
  state.rules = (state.rules || []).filter((rule: any) => String(rule.id) !== String(ruleId)) as any;
  await state.save();
  return true;
}

async function markItemRead(userId: string, itemId: string) {
  const state = await ensureState(userId);
  state.items = (state.items || []).map((item: any) =>
    String(item.id) === String(itemId) ? { ...item, isRead: true } : item
  ) as any;
  await state.save();
  return true;
}

async function markAllRead(userId: string) {
  const state = await ensureState(userId);
  state.items = (state.items || []).map((item: any) => ({ ...item, isRead: true })) as any;
  await state.save();
  return true;
}

export default {
  getFeed,
  updatePreferences,
  createRule,
  updateRule,
  deleteRule,
  markItemRead,
  markAllRead,
};
