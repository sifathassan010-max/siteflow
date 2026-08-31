import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  cssOffsetsForPosition,
  sanitizeWidgetPosition,
} from "@/lib/chatbot-widget-position";

// PUBLIC route — serves a small JS file, not a page. Customers add:
//   <script src="https://yoursite.com/embed/BOT_ID/widget.js"></script>
// This injects the chat widget as a fixed-position iframe floating in
// whichever corner the bot owner picked (Widget Position, in Settings),
// so the snippet the customer pastes never has to change when the owner
// changes the position later — this script looks it up fresh on every
// page load.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("widget_position")
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

  const script = `
(function () {
  var botId = ${JSON.stringify(id)};
  var containerId = "siteflow-chat-widget-" + botId;
  if (document.getElementById(containerId)) return; // already injected

  var offsets = ${JSON.stringify(offsets)};

  var container = document.createElement("div");
  container.id = containerId;
  container.style.position = "fixed";
  container.style.zIndex = "2147483000";
  container.style.width = "min(400px, calc(100vw - 32px))";
  container.style.height = "min(600px, calc(100vh - 32px))";
  container.style.boxShadow = "0 12px 32px rgba(0,0,0,0.18)";
  container.style.borderRadius = "16px";
  container.style.overflow = "hidden";
  Object.keys(offsets).forEach(function (side) {
    container.style[side] = offsets[side] + "px";
  });

  var iframe = document.createElement("iframe");
  iframe.src = ${JSON.stringify(embedUrl)};
  iframe.title = "Chat widget";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  container.appendChild(iframe);

  function inject() {
    document.body.appendChild(container);
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
