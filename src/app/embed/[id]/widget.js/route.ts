import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  cssOffsetsForPosition,
  sanitizeWidgetPosition,
} from "@/lib/chatbot-widget-position";

// PUBLIC route — serves a small JS file, not a page. Customers add:
//   <script src="https://yoursite.com/embed/BOT_ID/widget.js"></script>
// This injects a small round launcher bubble, fixed in whichever corner the
// bot owner picked (Widget Position, in Settings). The bubble shows the
// bot's configured avatar (image or GIF — GIFs animate natively since it's
// a plain <img>) or a default chat icon if no avatar is set. The full chat
// panel iframe is only created the first time a visitor clicks the bubble,
// and posts a message back to this script when the visitor closes it, which
// swaps back to the bubble. The snippet the customer pastes never has to
// change when the owner changes the position or avatar later — this script
// looks everything up fresh on every page load.
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
  const offsets = cssOffsetsForPosition(position, 24);
  const embedUrl = `${origin}/embed/${id}`;
  const widgetColor = bot.widget_color || "#4f46e5";
  const botName = bot.name || "Chat";

  const avatarConfig = bot.avatar_config as
    | { avatars?: { url?: string }[] }
    | null
    | undefined;
  const firstAvatarUrl =
    avatarConfig?.avatars?.find((a) => a && a.url)?.url ?? null;

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
  var avatarUrl = ${JSON.stringify(firstAvatarUrl)};
  var widgetColor = ${JSON.stringify(widgetColor)};
  var botName = ${JSON.stringify(botName)};
  var BUBBLE_SIZE = 64;

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
  bubble.style.width = BUBBLE_SIZE + "px";
  bubble.style.height = BUBBLE_SIZE + "px";
  bubble.style.borderRadius = "50%";
  bubble.style.border = "none";
  bubble.style.padding = "0";
  bubble.style.cursor = "pointer";
  bubble.style.overflow = "hidden";
  bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.22)";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.background = widgetColor;
  bubble.style.transition = "transform 0.15s ease";
  bubble.onmouseenter = function () { bubble.style.transform = "scale(1.06)"; };
  bubble.onmouseleave = function () { bubble.style.transform = "scale(1)"; };

  if (avatarUrl) {
    var img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    bubble.appendChild(img);
  } else {
    bubble.innerHTML = ${JSON.stringify(defaultIconSvg)};
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

  function openPanel() {
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
    panel.style.display = "block";
  }

  function closePanel() {
    panel.style.display = "none";
    bubble.style.display = "flex";
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
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
