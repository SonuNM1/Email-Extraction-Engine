// src/utils/cleanEmails.js

export const cleanEmails = (emails) => {
  const blockedPatterns = [
    "sentry.io",
    "wixpress.com",
    "example.com",
    "test.com",
    "johndoe",
    "sentry-next.wixpress.com"
  ];

  return [...new Set(
    emails
      .map((email) => {
        try {
          return decodeURIComponent(email.split("?")[0])
            .trim()
            .toLowerCase();
        } catch {
          return "";
        }
      })

      // remove empty / junk
      .filter((email) => email && email.length > 5)

      // remove image-like junk
      .filter((email) =>
        !email.endsWith(".png") &&
        !email.endsWith(".jpg") &&
        !email.endsWith(".webp")
      )

      // remove blocked domains
      .filter((email) =>
        !blockedPatterns.some((pattern) =>
          email.includes(pattern)
        )
      )
  )];
};