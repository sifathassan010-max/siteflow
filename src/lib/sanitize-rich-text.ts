// Server-side sanitizer for the rich-text fields (bot persona/instructions,
// and each custom query's description). Both are edited with
// src/components/rich-text-editor.tsx, which produces HTML via the
// browser's contentEditable — so before that HTML is stored or ever sent
// back down to a visitor's browser, it has to be stripped down to a small,
// known-safe subset. Never trust it just because it came from the bot
// owner's own account: a compromised account, or a malicious paste into
// the editor, is otherwise a stored-XSS hole aimed at every visitor of
// every site that embeds the bot.
import * as cheerio from "cheerio";

const ALLOWED_TAGS = new Set(["p", "br", "b", "strong", "i", "em", "u", "span", "a", "img", "div"]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  span: new Set(["style"]),
  div: new Set(["style"]),
  p: new Set(["style"]),
  a: new Set(["href", "style"]),
  img: new Set(["src", "alt", "style"]),
};

// Only layout/color properties the editor's own toolbar generates. No url(),
// no expression(), no position/z-index tricks — this list is deliberately
// short rather than trying to blocklist every dangerous CSS value.
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "text-align",
  "max-width",
  "width",
  "height",
  "display",
  "margin",
  "margin-left",
  "margin-right",
  "float",
]);

function cleanStyle(style: string): string {
  return style
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const prop = rule.split(":")[0]?.trim().toLowerCase();
      return !!prop && ALLOWED_STYLE_PROPS.has(prop);
    })
    .join("; ");
}

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  const $ = cheerio.load(html);

  $("script, style, iframe, object, embed, form, button, input, link, meta").remove();

  $("body")
    .find("*")
    .each((_, el) => {
      if (el.type !== "tag") return;
      const tag = el.tagName?.toLowerCase();

      if (!tag || !ALLOWED_TAGS.has(tag)) {
        // Unwrap disallowed tags rather than dropping their text content —
        // e.g. a pasted <h1>Title</h1> becomes plain text "Title", not gone.
        $(el).replaceWith($(el).contents());
        return;
      }

      const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
      const attribs = { ...el.attribs };
      for (const name of Object.keys(attribs)) {
        if (!allowed.has(name)) {
          $(el).removeAttr(name);
          continue;
        }
        if (name === "style") {
          $(el).attr("style", cleanStyle(attribs[name]));
        }
        if (name === "href" && tag === "a") {
          const href = attribs[name] || "";
          if (!/^https?:\/\//i.test(href)) $(el).removeAttr("href");
        }
        if (name === "src" && tag === "img") {
          const src = attribs[name] || "";
          if (!/^https?:\/\//i.test(src)) $(el).remove();
        }
      }

      if (tag === "a") {
        $(el).attr("target", "_blank");
        $(el).attr("rel", "noopener noreferrer");
      }
    });

  return $("body").html()?.trim() ?? "";
}

// Used wherever this content needs to be plain text instead of markup — the
// AI system prompt (an LLM should get clean instructions, not HTML tags)
// and any plain-text fallback rendering.
export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  $("body")
    .find("p, div, br")
    .each((_, el) => {
      $(el).after("\n");
    });
  return $("body")
    .text()
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
