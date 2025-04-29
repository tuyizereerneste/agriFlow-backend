import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload folders exist
const attendanceUploadDir = path.join(__dirname, "../uploads/attendance");
const logoUploadDir = path.join(__dirname, "../uploads/logos");

if (!fs.existsSync(attendanceUploadDir)) {
  fs.mkdirSync(attendanceUploadDir, { recursive: true });
}

if (!fs.existsSync(logoUploadDir)) {
  fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Storage config for attendance uploads
const attendanceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, attendanceUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Storage config for logo uploads
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, logoUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Export multer instances for attendance and logo uploads
export const attendanceUpload = multer({
  storage: attendanceStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

export const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});
