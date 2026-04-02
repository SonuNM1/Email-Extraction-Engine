import nodemailer from "nodemailer";
import { jobCompleteTemplate } from "../templates/jobCompleteTemplate.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NOTIFY_EMAIL,
    pass: process.env.NOTIFY_EMAIL_PASSWORD,
  },
});

export async function sendJobCompleteEmail(to, jobId, keyword, emailCount) {
  try {
    const downloadUrl = `${process.env.FRONTEND_URL}/api/scrape/${jobId}/export`;

    const html = jobCompleteTemplate({
      keyword,
      emailCount,
      downloadUrl
    });

    await transporter.sendMail({
      from: `"Email Scraper" <${process.env.NOTIFY_EMAIL}>`,
      to,
      subject: `✅ Scrape done — ${emailCount} emails found for "${keyword}"`,
      html,
    });

    console.log("✅ Email sent");
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
}
