const TRACKING_PARAMS = new Set(["trk", "trackingid", "ref"]);

function isTrackingParam(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.startsWith("utm_") || TRACKING_PARAMS.has(normalized);
}

function normalizeAshbyPath(pathname: string): string {
  return pathname.replace(/^\/([^/]+)\/job\//, "/$1/");
}

function normalizeKnownAts(url: URL): void {
  if (url.hostname === "jobs.ashbyhq.com") {
    url.pathname = normalizeAshbyPath(url.pathname);
  }
}

export function canonicalizeUrl(input: string): string {
  const trimmed = input.trim();
  const url = new URL(trimmed);

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  normalizeKnownAts(url);

  const searchParamKeys = [...url.searchParams.keys()];

  for (const key of searchParamKeys) {
    if (isTrackingParam(key)) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.href;
}
