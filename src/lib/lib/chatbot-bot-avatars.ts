// Shared types + validation for the chatbot builder's "Add Bot Avatar"
// feature: an image or GIF avatar shown in the chat widget, in either a
// single-avatar or multi-avatar (rotating) setup. Used by the create-bot
// form, the edit/settings form, the avatar upload route, and both bot API
// routes so the client and server never disagree on shape.
//
// Free-trial accounts: single avatar, image only (no GIF, no multi-avatar).
// Paid accounts: single avatar can also be a GIF, and multi-avatar (2-4
// avatars that rotate on a timer) unlocks.

export type AvatarKind = "image" | "gif";
export type AvatarMode = "single" | "multiple";

export type BotAvatar = {
  kind: AvatarKind;
  url: string;
  size: number; // px — one of AVATAR_SIZE_OPTIONS
};

export type BotAvatarConfig = {
  mode: AvatarMode;
  avatars: BotAvatar[];
  frequencySeconds: number; // rotation interval, only used when mode is "multiple"
};

// Avatar display size, in px, for the circular avatar shown in the widget.
// Sized to look right both large (widget header) and minimized (the small
// circle pinned above the chat bar) without the image looking blurry on
// small uploads or overwhelming the ~400px-wide embedded widget on large
// ones. Offered as discrete steps rather than a free-form number so every
// value renders crisply and the slider has a sensible number of stops.
export const AVATAR_MIN_SIZE = 40;
export const AVATAR_MAX_SIZE = 120;
const AVATAR_SIZE_STEP = 8;
export const AVATAR_SIZE_OPTIONS: number[] = Array.from(
  { length: (AVATAR_MAX_SIZE - AVATAR_MIN_SIZE) / AVATAR_SIZE_STEP + 1 },
  (_, i) => AVATAR_MIN_SIZE + i * AVATAR_SIZE_STEP
);
export const AVATAR_DEFAULT_SIZE = 64;

// How long each avatar shows before rotating to the next one, in a
// multi-avatar setup. Presets instead of a raw number input so owners
// can't accidentally set something jarring (e.g. 1 second).
export const AVATAR_FREQUENCY_OPTIONS = [5, 10, 15, 30, 60, 120] as const;
export const AVATAR_DEFAULT_FREQUENCY = 15;

export const MIN_MULTI_AVATARS = 2;
export const MAX_MULTI_AVATARS = 4;

// Upload limits enforced both client-side (for a fast error message) and
// server-side in the upload route (never trust the client). Small on
// purpose — this loads on every visitor's first paint of the widget.
export const MAX_IMAGE_BYTES = 500 * 1024; // 500KB
export const MAX_GIF_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg"];
export const ALLOWED_GIF_MIME = ["image/gif"];

export function emptyAvatar(kind: AvatarKind = "image"): BotAvatar {
  return { kind, url: "", size: AVATAR_DEFAULT_SIZE };
}

export function emptyAvatarConfig(): BotAvatarConfig {
  return { mode: "single", avatars: [], frequencySeconds: AVATAR_DEFAULT_FREQUENCY };
}

function isValidSize(n: unknown): n is number {
  return typeof n === "number" && AVATAR_SIZE_OPTIONS.includes(n);
}

function isValidUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const trimmed = u.trim();
  if (!trimmed || trimmed.length > 2000) return false;
  return /^https?:\/\//i.test(trimmed);
}

// Server-side sanitizer — never trust isPaid or the shape from the client.
export function sanitizeBotAvatarConfig(raw: unknown, isPaid: boolean): BotAvatarConfig {
  if (typeof raw !== "object" || raw === null) return emptyAvatarConfig();
  const input = raw as Record<string, unknown>;

  const requestedMode: AvatarMode = input.mode === "multiple" ? "multiple" : "single";
  const mode: AvatarMode = isPaid ? requestedMode : "single";

  const rawAvatars = Array.isArray(input.avatars) ? input.avatars : [];
  let avatars: BotAvatar[] = rawAvatars
    .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
    .map((a) => ({
      kind: (a.kind === "gif" ? "gif" : "image") as AvatarKind,
      url: isValidUrl(a.url) ? (a.url as string).trim().slice(0, 2000) : "",
      size: isValidSize(a.size) ? (a.size as number) : AVATAR_DEFAULT_SIZE,
    }))
    .filter((a) => a.url.length > 0);

  // Free accounts: image kind only, and never more than one avatar.
  if (!isPaid) {
    avatars = avatars.filter((a) => a.kind === "image").slice(0, 1);
  }

  avatars = avatars.slice(0, mode === "single" ? 1 : MAX_MULTI_AVATARS);

  const frequencySeconds = (AVATAR_FREQUENCY_OPTIONS as readonly number[]).includes(
    input.frequencySeconds as number
  )
    ? (input.frequencySeconds as number)
    : AVATAR_DEFAULT_FREQUENCY;

  return { mode, avatars, frequencySeconds };
}
