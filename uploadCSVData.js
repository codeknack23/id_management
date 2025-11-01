import fs from "fs";
import csv from "csv-parser";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// === CONFIG ===
const SHEET_NAME = "students"; // Change if your sheet name differs
const CSV_FILE_PATH = "students.csv"; // Path to your local CSV file

// === LOAD GOOGLE AUTH ===
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// === READ CSV AND UPLOAD ===
async function uploadCSVToGoogleSheet() {
  const rows = [];

  // Read CSV file
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on("data", (data) => rows.push(Object.values(data)))
    .on("end", async () => {
      console.log(`📄 CSV Loaded: ${rows.length} rows found`);

      try {
        // Append all rows to Google Sheet
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: SHEET_NAME,
          valueInputOption: "USER_ENTERED",
          resource: { values: rows },
        });

        console.log("✅ Data uploaded successfully!");
        console.log("Updated Range:", response.data.updates.updatedRange);
      } catch (err) {
        console.error("❌ Error uploading to Google Sheet:", err.message);
      }
    });
}

uploadCSVToGoogleSheet();
