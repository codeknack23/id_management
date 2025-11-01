// server.js
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { google } from "googleapis";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public"));

// Multer temp upload dir
const upload = multer({ dest: "uploads/" });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Google Sheets auth helper
async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// Endpoint: accept form (multipart/form-data) with 'photo' field
app.post("/api/add-student", upload.single("photo"), async (req, res) => {
  try {
    const { rollNo, fullName, dob, mobile, bloodGroup, address, email } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "Photo required" });

    // 1) upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: "student_uploads" });

    // remove local temp file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    // 2) append to Google Sheet
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "students!A:H", // change Sheet1 to your tab name if needed
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[rollNo, fullName, dob, mobile, bloodGroup, address, email, uploadResult.secure_url]],
      },
    });

    res.json({ success: true, message: "Saved", imageUrl: uploadResult.secure_url });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
