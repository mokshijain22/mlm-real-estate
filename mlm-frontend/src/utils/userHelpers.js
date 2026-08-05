export function getStoredUser(fallback = null) {
  try {
    if (typeof window === "undefined") return fallback;

    const raw = localStorage.getItem("user");
    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}