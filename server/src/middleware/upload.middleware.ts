import multer from "multer";

// memory storage: file stays in RAM, we upload buffer to cloudinary
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});
