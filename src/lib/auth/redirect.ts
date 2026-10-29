const defaultNextPath = "/";

export function getSafeNextPath(next: string | null | undefined, fallback = defaultNextPath) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }

  return next;
}

export function getCurrentPath(pathname: string, search = "", hash = "") {
  return `${pathname}${search}${hash}`;
}
