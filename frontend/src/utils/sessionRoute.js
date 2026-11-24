const SESSION_PATH_REGEX = /^\/sesi\/([a-zA-Z0-9-]+)\/?$/;
const SKPI_VERIFY_PATH_REGEX = /^\/verifikasi-skpi\/([a-zA-Z0-9-]+)\/?$/;

function matchPathId(regex, pathname) {
  const path =
    typeof pathname === "string"
      ? pathname
      : typeof window !== "undefined"
        ? window.location.pathname
        : "/";
  const match = path.match(regex);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function getSessionIdFromPath(pathname) {
  return matchPathId(SESSION_PATH_REGEX, pathname);
}

export function getSKPIVerifyIdFromPath(pathname) {
  return matchPathId(SKPI_VERIFY_PATH_REGEX, pathname);
}

export function buildSessionUrl(groupId) {
  if (!groupId) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/sesi/${encodeURIComponent(groupId)}`;
}

export function buildSKPIVerifyUrl(userId) {
  if (!userId) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/verifikasi-skpi/${encodeURIComponent(userId)}`;
}

export function pushSessionPath(groupId) {
  if (!groupId || typeof window === "undefined") return;
  const targetPath = `/sesi/${encodeURIComponent(groupId)}`;
  if (window.location.pathname !== targetPath) {
    window.history.pushState({ sessionId: groupId }, "", targetPath);
  }
}

export function clearSessionPath() {
  if (typeof window === "undefined") return;
  if (getSessionIdFromPath(window.location.pathname)) {
    window.history.pushState({}, "", "/");
  }
}

export function clearSKPIVerifyPath() {
  if (typeof window === "undefined") return;
  if (getSKPIVerifyIdFromPath(window.location.pathname)) {
    window.history.pushState({}, "", "/");
  }
}
