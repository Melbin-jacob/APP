// Shared by the sign-up form and the server so both apply the same format rules.

const UK_FULL = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/;
const US_ZIP = /^(\d{5})(?:-\d{4})?$/;

/** Format check + normalisation ("sw1a1aa" → "SW1A 1AA", "90210-1234" → "90210"). No network call. */
export function parsePostcode(raw: string): { country: "GB" | "US"; code: string } | null {
  const v = raw.trim().toUpperCase().replace(/\s+/g, " ");
  const uk = v.match(UK_FULL);
  if (uk) return { country: "GB", code: `${uk[1]} ${uk[2]}` };
  const us = v.match(US_ZIP);
  if (us) return { country: "US", code: us[1] };
  return null;
}
