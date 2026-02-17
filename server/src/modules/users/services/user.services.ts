import { ApiError } from "../../../utils/apiError";
import User from "../../../models/User.model";

const MAX_LEN = 200;

function sanitizeString(value: any, max = MAX_LEN) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return "";
  return s.slice(0, max);
}

export async function updateMe(
  userId: string,
  body: { name?: string; phone?: string; address?: string; company?: string; bio?: string }
) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const updates: any = {};

  const name = sanitizeString(body.name, 120);
  const phone = sanitizeString(body.phone, 40);
  const address = sanitizeString(body.address, 200);
  const company = sanitizeString((body as any).company || (body as any).agencyName, 160);
  const bio = sanitizeString(body.bio, 500);

  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (company !== undefined) updates.company = company;
  if (bio !== undefined) updates.bio = bio;

  Object.assign(user, updates);
  await user.save();

  return user.toObject();
}
