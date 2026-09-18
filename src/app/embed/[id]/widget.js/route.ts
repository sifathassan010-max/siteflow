import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  cssOffsetsForPosition,
  sanitizeWidgetPosition,
} from "@/lib/chatbot-widget-position";
import {
  AVATAR_DEFAULT_SIZE,
  AVATAR_MAX_SIZE,
  AVATAR_MIN_SIZE,
  type BotAvatarConfig,
} from "@/lib/chatbot-bot-avatars";

// PUBLIC route — serves a small JS file, not a page. Customers add:
//   <script src="https://yoursite.com/embed/BOT_ID/widget.js"></script>
// This injects a small round launcher bubble, fixed in whichever corner the
// bot owner picked (Widget Position, in Settings). The bubble shows the
// bot's configured avatar — a single image/GIF, or (paid) a set of 2-4 that
// rotate on a timer at each avatar's own size — or a default chat icon if
// no avatar is set. This is the ONLY place the avatar renders: once the
// visitor opens the chat panel, the avatar's job is done and nothing
// avatar-related shows in the panel itself. The full chat panel iframe is
// only created the first time a visitor clicks the bubble, and posts a
// message back to this script when the visitor closes it, which swaps back
// to the bubble. The snippet the customer pastes never has to change when
// the owner changes the position, color or avatar later — this script
// looks everything up fresh on every page load.
// This route must run fresh on every single request — it's the only place
// the bot's avatar/position/color settings reach a visitor's browser, and
// an owner who just changed those in Settings expects the change to show
// up immediately, not after a build-time cache or CDN cache window. Force
// dynamic rendering explicitly rather than relying on Next.js's default
// heuristics (using the Request object already implies this, but stating
// it directly here removes any ambiguity).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("widget_position, widget_color, avatar_config, name")
    .eq("id", id)
    .maybeSingle();

  if (!bot) {
    return new NextResponse("console.warn('SiteFlow: chatbot not found');", {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const position = sanitizeWidgetPosition(bot.widget_position);
  const offsets = cssOffsetsForPosition(position, 30);
  const embedUrl = `${origin}/embed/${id}`;
  const widgetColor = bot.widget_color || "#4f46e5";
  const botName = bot.name || "Chat";

  const avatarConfig = bot.avatar_config as BotAvatarConfig | null | undefined;

  // Defensive re-validation here too (not just at save time): clamp every
  // size into the known range and drop anything without a URL, so a bad/old
  // row in the database can never break the bubble on a live customer site.
  const avatars = (avatarConfig?.avatars ?? [])
    .filter((a) => a && a.url)
    .map((a) => ({
      url: a.url,
      size: Math.min(
        AVATAR_MAX_SIZE,
        Math.max(AVATAR_MIN_SIZE, a.size || AVATAR_DEFAULT_SIZE)
      ),
    }));
  const rotates = avatarConfig?.mode === "multiple" && avatars.length > 1;
  const frequencySeconds =
    avatarConfig?.frequencySeconds && avatarConfig.frequencySeconds > 0
      ? avatarConfig.frequencySeconds
      : 15;

  // Default bubble icon (no avatar configured) — a simple chat-bubble glyph
  // on the bot's brand color, so the launcher never looks broken/empty.
  const defaultIconSvg = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4.4 3.3A1 1 0 0 1 3 19.5V5a1 1 0 0 1 1-1Z" fill="white"/>
    </svg>
  `.trim();

  const script = `
(function () {
  var botId = ${JSON.stringify(id)};
  var wrapperId = "siteflow-chat-widget-" + botId;
  if (document.getElementById(wrapperId)) return; // already injected

  var offsets = ${JSON.stringify(offsets)};
  var embedUrl = ${JSON.stringify(embedUrl)};

  // Never run inside our own chat panel. The panel is an iframe pointing at
  // embedUrl; if that page ever loads this script too, we would draw a
  // second launcher bubble on top of the open panel and open a chat inside
  // the chat on every click. Cheap, exact check — the page's own address.
  try {
    if (window.location.href.indexOf(embedUrl) === 0) return;
  } catch (e) {}

  var widgetColor = ${JSON.stringify(widgetColor)};
  var botName = ${JSON.stringify(botName)};
  var avatars = ${JSON.stringify(avatars)}; // [{ url, size }], already validated server-side
  var rotates = ${JSON.stringify(rotates)};
  var rotateMs = ${JSON.stringify(frequencySeconds)} * 1000;
  var DEFAULT_ICON_SIZE = 64; // only used when no avatar is configured
  var AVATAR_FRAME_SIZE = 120; // fixed frame the avatar sits inside — see below

  var wrapper = document.createElement("div");
  wrapper.id = wrapperId;
  wrapper.style.position = "fixed";
  wrapper.style.zIndex = "2147483000";
  Object.keys(offsets).forEach(function (side) {
    wrapper.style[side] = offsets[side] + "px";
  });

  // --- Launcher bubble: the initial, minimized state ---
  var bubble = document.createElement("button");
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Open chat with " + botName);
  bubble.style.width = DEFAULT_ICON_SIZE + "px";
  bubble.style.height = DEFAULT_ICON_SIZE + "px";
  bubble.style.borderRadius = "50%";
  bubble.style.border = "none";
  bubble.style.padding = "0";
  bubble.style.cursor = "pointer";
  bubble.style.overflow = "hidden"; // keep the avatar clipped to the circle
  bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.22)";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.background = widgetColor;
  bubble.style.transition = "transform 0.15s ease";
  bubble.onmouseenter = function () { bubble.style.transform = "scale(1.06)"; };
  bubble.onmouseleave = function () { bubble.style.transform = "scale(1)"; };

  // The avatar itself sits inside the bubble in its own wrapper, independently
  // scaled for the shrink/grow swap animation so it never fights with the
  // bubble's own hover scale.
  //
  // The BUBBLE (the button, i.e. the click target and the corner it's
  // pinned to) stays a fixed AVATAR_FRAME_SIZE square, transparent, the
  // whole time — it never resizes as the chosen avatar size changes. This
  // matches the size picker in the dashboard itself (bot-avatar-editor.tsx):
  // a fixed max-size frame with the avatar image scaled up/down inside it,
  // not a frame that grows and shrinks with the image. Only the avatarSlot
  // — the circular image itself — is set to the owner's chosen size
  // (40-120px) and centered inside that fixed frame. With an avatar set,
  // the bubble also drops its brand-colour fill and shadow, so what the
  // visitor sees is just the image/GIF floating at its chosen size, not an
  // image inside a coloured disc that changes size with it.
  var avatarSlot = document.createElement("div");
  avatarSlot.style.borderRadius = "0"; // square, not a circular clip
  avatarSlot.style.overflow = "hidden";
  avatarSlot.style.display = "flex";
  avatarSlot.style.alignItems = "center";
  avatarSlot.style.justifyContent = "center";
  avatarSlot.style.transition = "width 0.2s ease, height 0.2s ease, transform 0.25s ease";
  avatarSlot.style.transform = "scale(1)";

  var avatarImg = null;
  var activeIndex = 0;

  // If an avatar URL is dead (deleted from storage, a bucket that is not
  // public, or a link that is a web page rather than an image file), the
  // browser paints a broken-image glyph inside the bubble. Fall back to the
  // default chat icon instead, so a bad URL never looks like a broken site.
  function showDefaultIcon() {
    if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    avatarImg = null;
    bubble.innerHTML = ${JSON.stringify(defaultIconSvg)};
    bubble.style.background = widgetColor;
    bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.22)";
    bubble.style.width = DEFAULT_ICON_SIZE + "px";
    bubble.style.height = DEFAULT_ICON_SIZE + "px";
  }

  function showAvatar(index) {
    var avatar = avatars[index];
    if (!avatar) return;
    // Only the inner slot follows the chosen size — the bubble/frame stays
    // fixed at AVATAR_FRAME_SIZE so the click target and page layout never
    // shift as differently-sized avatars rotate in.
    avatarSlot.style.width = avatar.size + "px";
    avatarSlot.style.height = avatar.size + "px";
    if (!avatarImg) {
      avatarImg = document.createElement("img");
      avatarImg.alt = "";
      avatarImg.style.width = "100%";
      avatarImg.style.height = "100%";
      avatarImg.style.objectFit = "cover";
      avatarImg.style.display = "block";
      avatarImg.onerror = showDefaultIcon;
      avatarSlot.appendChild(avatarImg);
    }
    // Plain <img> so GIFs keep animating natively — no extra work needed.
    avatarImg.src = avatar.url;
  }

  var rotateTimer = null;

  if (avatars.length > 0) {
    // Fixed frame, not a coloured disc: the image/GIF is what the visitor
    // sees, at its own chosen size, centered in a frame that doesn't move.
    bubble.style.width = AVATAR_FRAME_SIZE + "px";
    bubble.style.height = AVATAR_FRAME_SIZE + "px";
    bubble.style.borderRadius = "0"; // a plain box — it's invisible anyway
    bubble.style.overflow = "visible"; // never clip the (smaller-or-equal) avatarSlot
    bubble.style.background = "transparent";
    bubble.style.boxShadow = "none";
    bubble.appendChild(avatarSlot);
    showAvatar(0);
  } else {
    bubble.innerHTML = ${JSON.stringify(defaultIconSvg)};
  }

  if (rotates) {
    rotateTimer = setInterval(function () {
      // Shrink the current avatar out, swap the image while invisible-small,
      // then grow the next one back in — same feel as a manual minimize/
      // restore, just automatic.
      avatarSlot.style.transform = "scale(0.15)";
      setTimeout(function () {
        activeIndex = (activeIndex + 1) % avatars.length;
        showAvatar(activeIndex);
        avatarSlot.style.transform = "scale(1)";
      }, 250);
    }, rotateMs);
  }

  // --- Chat panel: created lazily on first open ---
  var panel = document.createElement("div");
  panel.style.display = "none";
  panel.style.width = "min(400px, calc(100vw - 32px))";
  panel.style.height = "min(600px, calc(100vh - 32px))";
  panel.style.boxShadow = "0 12px 32px rgba(0,0,0,0.18)";
  panel.style.borderRadius = "16px";
  panel.style.overflow = "hidden";

  var iframe = null;
  var isOpen = false; // single source of truth — the bubble's own display style is a symptom, never the check

  function openPanel() {
    if (isOpen) return; // already open: never create a second panel/iframe
    isOpen = true;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = "Chat widget";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      panel.appendChild(iframe);
    }
    bubble.style.display = "none";
    bubble.style.visibility = "hidden";
    bubble.style.pointerEvents = "none";
    panel.style.display = "block";
  }

  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    panel.style.display = "none";
    bubble.style.display = "flex";
    bubble.style.visibility = "visible";
    bubble.style.pointerEvents = "auto";
  }

  bubble.addEventListener("click", openPanel);

  // The embedded page posts this message when the visitor clicks its own
  // close/minimize button, so we can swap back to the bubble.
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (data && data.type === "siteflow:minimize" && data.botId === botId) {
      closePanel();
    }
  });

  wrapper.appendChild(bubble);
  wrapper.appendChild(panel);

  function inject() {
    document.body.appendChild(wrapper);
  }

  if (document.body) {
    inject();
  } else {
    document.addEventListener("DOMContentLoaded", inject);
  }
})();
`.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
