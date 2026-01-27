import multer from "multer";
import { ApiError } from "../utils/apiError";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new ApiError(400, "Only image files are allowed"));
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
