export function jobCompleteTemplate({ keyword, emailCount, downloadUrl }) {
  return `
    <h2>Your scrape is complete!</h2>
    <p>
      Found <strong>${emailCount} emails</strong> for 
      "<strong>${keyword}</strong>".
    </p>

    <a href="${downloadUrl}" 
       style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px;">
       Download CSV
    </a>
  `;
}