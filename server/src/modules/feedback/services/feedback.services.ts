import Feedback from "../../../models/Feedback.model";
import User from "../../../models/User.model";
import { ApiError } from "../../../utils/apiError";

type CreateFeedbackInput = {
  userId: string;
  userRole: string;
  category: string;
  message: string;
  rating: number;
  allowContact: boolean;
};

async function createFeedback(input: CreateFeedbackInput) {
  const item = await Feedback.create({
    userId: input.userId,
    userRole: input.userRole,
    category: input.category,
    message: input.message,
    rating: input.rating,
    allowContact: input.allowContact,
    status: "new",
  });

  return item;
}

async function getMyFeedback(userId: string) {
  return Feedback.find({ userId }).sort({ createdAt: -1 }).lean();
}

async function getAdminFeedback(query: any) {
  const role = String(query?.role || "").trim().toLowerCase();
  const rating = Number(query?.rating || 0);
  const status = String(query?.status || "").trim().toLowerCase();
  const category = String(query?.category || "").trim().toLowerCase();
  const search = String(query?.search || "").trim();

  const mongoQuery: Record<string, any> = {};
  if (role) mongoQuery.userRole = role;
  if (Number.isFinite(rating) && rating > 0) mongoQuery.rating = rating;
  if (status) mongoQuery.status = status;
  if (category) mongoQuery.category = category;

  const rows = await Feedback.find(mongoQuery).sort({ createdAt: -1 }).lean();
  const userIds = Array.from(new Set(rows.map((row: any) => String(row.userId || "")).filter(Boolean)));
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name email").lean()
    : [];

  const userMap = new Map(users.map((user: any) => [String(user._id), user]));

  let items = rows.map((row: any) => {
    const user = userMap.get(String(row.userId));
    return {
      id: String(row._id),
      userId: String(row.userId),
      userRole: row.userRole,
      category: row.category,
      rating: Number(row.rating || 0),
      message: String(row.message || ""),
      allowContact: Boolean(row.allowContact),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userName: String(user?.name || "User"),
      userEmail: String(user?.email || ""),
    };
  });

  if (search) {
    const q = search.toLowerCase();
    items = items.filter((item) =>
      item.message.toLowerCase().includes(q) ||
      item.userName.toLowerCase().includes(q) ||
      item.userEmail.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }

  const counts = {
    total: items.length,
    new: items.filter((item) => item.status === "new").length,
    reviewed: items.filter((item) => item.status === "reviewed").length,
    resolved: items.filter((item) => item.status === "resolved").length,
  };

  return { items, counts };
}

async function updateFeedbackStatus(id: string, status: "new" | "reviewed" | "resolved") {
  const item = await Feedback.findByIdAndUpdate(id, { status }, { new: true }).lean();
  if (!item) throw new ApiError(404, "Feedback not found");
  return item;
}

export default {
  createFeedback,
  getMyFeedback,
  getAdminFeedback,
  updateFeedbackStatus,
};