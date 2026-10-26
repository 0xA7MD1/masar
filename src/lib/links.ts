import type { Source } from "./constants";

/** Phones with an Arabic keyboard type ٠١٢ or ۰۱۲; store Western digits. */
export function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // "frontend dev" or "localhost" parse as hosts too, but nobody posts jobs there.
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

/** A hostname label (any part of "saudi.tanqeeb.com") that identifies the site. */
const LABEL_SOURCES: Record<string, Source> = {
  linkedin: "linkedin",
  lnkd: "linkedin",
  jadarat: "jadarat",
  bayt: "bayt",
  indeed: "indeed",
  tanqeeb: "tanqeeb",
  mourjan: "mourjan",
  sabbar: "sabbar",
  whatsapp: "whatsapp",
};

/**
 * Guesses where a job came from by its link. Known job boards map to their key;
 * any other site is most likely the company's own careers page (or its hiring tool).
 */
export function detectSource(link: string | null | undefined): Source | null {
  const url = link ? parseHttpUrl(link) : null;
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "wa.me") return "whatsapp";
  for (const label of host.split(".")) {
    const source = LABEL_SOURCES[label];
    if (source) return source;
  }
  return "company_site";
}

/** "careers.stc.com.sa" for showing which site a link points to. */
export function linkHost(link: string | null | undefined): string | null {
  const url = link ? parseHttpUrl(link) : null;
  return url ? url.hostname.replace(/^www\./, "") : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Saudi numbers are often written locally (05…); WhatsApp needs the country code. */
function toInternationalPhone(value: string): string | null {
  const compact = toWesternDigits(value).replace(/[\s\-().]/g, "");
  if (!/^\+?\d{8,15}$/.test(compact)) return null;
  const digits = compact.replace(/^\+/, "").replace(/^00/, "");
  if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `966${digits}`;
  return digits;
}

/**
 * Turns what was typed into the follow-up field into a link the "تابع" button opens:
 * a phone number becomes a WhatsApp chat, an email a Gmail search, anything else a URL.
 * Returns null when it is none of these.
 */
export function toFollowUpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (EMAIL_RE.test(trimmed) && !trimmed.includes("/")) {
    return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(trimmed)}`;
  }
  const phone = toInternationalPhone(trimmed);
  if (phone) return `https://wa.me/${phone}`;
  return parseHttpUrl(trimmed)?.href ?? null;
}

export type FollowUpKind = "whatsapp" | "email" | "link";

export function followUpKind(link: string): FollowUpKind {
  const host = linkHost(link) ?? "";
  if (host === "wa.me" || host.endsWith("whatsapp.com")) return "whatsapp";
  if (host === "mail.google.com" || host.startsWith("outlook.")) return "email";
  return "link";
}
