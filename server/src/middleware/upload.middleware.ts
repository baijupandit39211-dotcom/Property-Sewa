import multer from "multer";
import { ApiError } from "../utils/apiError";

const storage = multer.memoryStorage();
const CHAT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new ApiError(400, "Only image files are allowed"));
  }
  cb(null, true);
};

const chatFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!CHAT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new ApiError(400, "Unsupported chat attachment type"));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per image
    files: 6, // max 6 images
  },
  fileFilter,
});

export const chatUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
  fileFilter: chatFileFilter,
});
