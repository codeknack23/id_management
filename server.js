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

// 📘 Get all students list (Roll No + Name)
app.get("/api/students", async (req, res) => {
  try {
    const sheets = await getSheets(); // ✅ FIXED: Create sheets client first
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "students!A:B", // Roll No and Full Name columns
    });

    const rows = response.data.values || [];
    // Skip header row if present
    const students = rows.slice(1).map((r) => ({
      rollNo: r[0],
      fullName: r[1],
    }));

    res.json({ success: true, students });
  } catch (err) {
    console.error("Error reading sheet:", err);
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
});

// 📤 Add new student (with photo)
app.post("/api/add-student", upload.single("photo"), async (req, res) => {
  try {
    const { rollNo, fullName, dob, mobile, bloodGroup, address, email } =
      req.body;
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Photo required" });

    // Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "student_uploads",
    });

    // Remove local temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}

    // Append to Google Sheet
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "students!A:H", // must match your actual sheet tab
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            rollNo,
            fullName,
            mobile,
            email,
            dob,
            bloodGroup,
            address,
            uploadResult.secure_url,
          ],
        ],
      },
    });

    res.json({ success: true, message: "Saved successfully!" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
