import multer from "multer";
import path from "path";
import fs from "fs";

// Define upload directories
const attendanceUploadDir = path.join(__dirname, "../../uploads/attendance");
const logoUploadDir = path.join(__dirname, "../../uploads/logos");

// Ensure upload folders exist
if (!fs.existsSync(attendanceUploadDir)) {
  console.log("Creating attendance upload directory...");
  fs.mkdirSync(attendanceUploadDir, { recursive: true });
}

if (!fs.existsSync(logoUploadDir)) {
  console.log("Creating logo upload directory...");
  fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Storage config for attendance uploads
const attendanceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attendanceUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const finalName = file.fieldname + "-" + uniqueSuffix + ext;
    cb(null, finalName);
  },
});

// Storage config for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Saving logo file to:", logoUploadDir);
    cb(null, logoUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const finalName = file.fieldname + "-" + uniqueSuffix + ext;
    cb(null, finalName);
  },
});

// Export configured multer instances
export const attendanceUpload = multer({
  storage: attendanceStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});