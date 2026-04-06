import { getDomain } from "../../utils/domain.util.js";

export function isValidEmail(email, sourceUrl) {
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) return false;

  if (/\.(edu|gov)$/i.test(domain)) return false;

  const pageDomain = getDomain(sourceUrl);
  if (domain !== pageDomain) return false;

  if (["info", "contact", "sales"].includes(local)) return true;
  if (/^[a-z]+\.[a-z]+$/.test(local)) return true;

  return false;
}