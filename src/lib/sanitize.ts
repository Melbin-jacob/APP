import DOMPurify from "isomorphic-dompurify";

/** Strip all markup. User text is rendered as text, never as HTML. */
export function plainText(input: string, maxLength = 5000): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

/** Only absolute http(s) URLs; blocks javascript:, data:, protocol-relative, etc. */
export function safeUrl(input: string): string | null {
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
