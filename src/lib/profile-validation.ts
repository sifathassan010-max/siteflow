import { COUNTRIES } from "./countries";

export type ProfileFormInput = {
  full_name?: unknown;
  username?: unknown;
  company_name?: unknown;
  website_url?: unknown;
  country?: unknown;
};

export type SanitizedProfile = {
  full_name: string | null;
  username: string | null;
  company_name: string | null;
  website_url: string | null;
  country: string | null;
};

export type ProfileValidationResult =
  | { ok: true; data: SanitizedProfile }
  | { ok: false; errors: string[] };

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 200;

// Every field here is optional — an empty/missing value is always valid and
// normalizes to null. Errors only occur when a NON-empty value is malformed.
export function validateProfileInput(input: ProfileFormInput): ProfileValidationResult {
  const errors: string[] = [];

  const fullName = normalizeOptionalString(input.full_name, MAX_NAME_LENGTH);
  if (fullName === "TOO_LONG") errors.push(`Full name must be ${MAX_NAME_LENGTH} characters or fewer`);

  const username = normalizeOptionalString(input.username, 20);
  let cleanUsername: string | null = null;
  if (username === "TOO_LONG") {
    errors.push("Username must be 20 characters or fewer");
  } else if (username !== null && !USERNAME_PATTERN.test(username)) {
    errors.push("Username must be 3-20 characters, letters/numbers/underscore only");
  } else {
    cleanUsername = username;
  }

  const companyName = normalizeOptionalString(input.company_name, MAX_NAME_LENGTH);
  if (companyName === "TOO_LONG") errors.push(`Company name must be ${MAX_NAME_LENGTH} characters or fewer`);

  const websiteRaw = normalizeOptionalString(input.website_url, MAX_URL_LENGTH);
  let cleanWebsite: string | null = null;
  if (websiteRaw === "TOO_LONG") {
    errors.push(`Website must be ${MAX_URL_LENGTH} characters or fewer`);
  } else if (websiteRaw !== null) {
    const normalized = normalizeUrl(websiteRaw);
    if (!normalized) errors.push("Enter a valid website address");
    else cleanWebsite = normalized;
  }

  const countryRaw = normalizeOptionalString(input.country, 100);
  let cleanCountry: string | null = null;
  if (countryRaw !== null) {
    if (!COUNTRIES.includes(countryRaw)) errors.push("Select a valid country from the list");
    else cleanCountry = countryRaw;
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      full_name: fullName === "TOO_LONG" ? null : fullName,
      username: cleanUsername,
      company_name: companyName === "TOO_LONG" ? null : companyName,
      website_url: cleanWebsite,
      country: cleanCountry,
    },
  };
}

// Returns: trimmed string | null (empty/missing) | "TOO_LONG" (sentinel)
function normalizeOptionalString(value: unknown, maxLength: number): string | null | "TOO_LONG" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) return "TOO_LONG";
  return trimmed;
}

// Accepts "example.com" or "https://example.com", returns a normalized
// "https://..." form, or null if it's not a parseable URL/host at all.
function normalizeUrl(value: string): string | null {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null; // reject "https://localhost"-style junk
    return url.toString();
  } catch {
    return null;
  }
}
