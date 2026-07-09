export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(`Refusing to fetch this URL: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

const PRIVATE_HOST_PATTERNS: Array<{ test: (host: string) => boolean; reason: string }> = [
  { test: (h) => h === "localhost" || h.endsWith(".localhost"), reason: "localhost" },
  { test: (h) => h.endsWith(".local") || h.endsWith(".internal"), reason: "internal hostname" },
  { test: (h) => !h.includes("."), reason: "unqualified hostname" },
  { test: (h) => h.includes(":"), reason: "IPv6 literal" },
  {
    test: (h) => {
      const octets = h.split(".").map(Number);
      if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return false;
      const [a, b] = octets;
      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a >= 224 // multicast/reserved
      );
    },
    reason: "private or reserved IP address",
  },
];

/**
 * SSRF guard for user-provided company websites: only public http(s) hosts.
 * (Best-effort hostname screening — DNS-rebinding-grade isolation would need
 * a fetch proxy, out of scope for the MVP.)
 */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`protocol ${url.protocol} is not allowed`);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  for (const { test, reason } of PRIVATE_HOST_PATTERNS) {
    if (test(host)) throw new UnsafeUrlError(reason);
  }
  return url;
}

/** Strips markup down to readable text (pure, unit-tested). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/**
 * Fetches the page at a user-provided URL and returns readable text, capped.
 * Throws UnsafeUrlError for non-public targets; returns null on fetch failure.
 */
export async function fetchWebsiteText(
  raw: string,
  { timeoutMs = 8000, maxChars = 8000 }: { timeoutMs?: number; maxChars?: number } = {},
): Promise<string | null> {
  let url = assertPublicHttpUrl(raw);
  try {
    // Follow redirects manually so every hop is re-screened — a public host
    // must not be able to bounce us to a private address.
    let response: Response;
    for (let hop = 0; ; hop += 1) {
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "manual",
        headers: { "user-agent": "IPOCompassBot/1.0 (+company profile pre-fill)" },
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location || hop >= 3) return null;
      url = assertPublicHttpUrl(new URL(location, url).toString());
    }
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }
    const body = await response.text();
    const text = htmlToText(body.slice(0, 500_000));
    return text ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  }
}
