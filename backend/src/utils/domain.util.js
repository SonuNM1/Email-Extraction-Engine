export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getRoot(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}