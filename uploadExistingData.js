import fs from "fs";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// Load data from students.json
const jsonData = fs.readFileSync("students.json", "utf-8");
const students = JSON.parse(jsonData);

// Convert objects to 2D array (for Google Sheets)
const values = [
  [
    "Roll No",
    "Student Name",
    "Mobile Number",
    "Email",
    "Date of Birth",
    "Blood Group",
    "Address",
    "Photo URL",
    "Created At",
  ],
  ...students.map((student) => [
    student["Roll No"],
    student["Student Name"],
    student["Mobile Number"],
    student["Email"],
    student["Date of Birth"],
    student["Blood Group"],
    student["Address"],
    student["Photo URL"],
    student["Created At"],
  ]),
];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function uploadData() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = "Sheet1"; // ✅ Use only sheet name, not A:H
    const valueInputOption = "USER_ENTERED";

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      resource: { values },
    });

    console.log("✅ Data uploaded successfully!");
    console.log("Updated range:", response.data.updates.updatedRange);
  } catch (error) {
    console.error("❌ Error uploading data:", error.message);
  }
}

uploadData();
