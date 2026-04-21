import nodemailer from "nodemailer";
import { jobCompleteTemplate } from "../templates/jobCompleteTemplate.js";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NOTIFY_EMAIL,
    pass: process.env.NOTIFY_EMAIL_PASSWORD,
  },
});

export async function sendJobCompleteEmail(to, jobId, keyword, emailCount, filePath) {
  try {
    const downloadUrl = `${process.env.FRONTEND_URL}/api/scrape/${jobId}/export`;

    const html = jobCompleteTemplate({ keyword, emailCount, downloadUrl });

    const mailOptions = {
      from: `"Email Scraper" <${process.env.NOTIFY_EMAIL}>`,
      to,
      subject: `✅ Scrape done — ${emailCount} emails found for "${keyword}"`,
      html,
    };

    // Attach Excel if file exists
    if (filePath && fs.existsSync(filePath)) {
      mailOptions.attachments = [
        {
          filename: path.basename(filePath),
          path: filePath,
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent with attachment");
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
}