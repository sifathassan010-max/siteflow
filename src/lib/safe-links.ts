// Pure (no I/O) helpers for turning chat text into SAFE links.
//  - client side: splitLinks() -> React renders <a> elements (no innerHTML ever)
//  - server side: restrictReplyLinks() strips links the bot was never given
// Unit-tested in safe-links.test.ts.

export type LinkPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

// [label](https://url)  |  bare https://url
const LINK_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]{1,2000})\)|(https?:\/\/[^\s<>"'`]+)/gi;

// Returns a normalized http(s) URL, or null for anything else
// (javascript:, data:, user:pass@host, single-label hosts, absurd length).
export function toSafeHttpUrl(raw: string): string | null {
  if (!raw || raw.length > 2000) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Splits "https://x.com/a)." into the URL and the punctuation that belongs to
// the sentence, not to the URL.
function trimTrailing(raw: string): { url: string; rest: string } {
  let url = raw;
  let rest = "";
  for (;;) {
    const last = url[url.length - 1];
    if (last === undefined) break;
    if (".,;:!?'\"]*".includes(last)) {
      rest = last + rest;
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")") {
      const opens = (url.match(/\(/g) ?? []).length;
      const closes = (url.match(/\)/g) ?? []).length;
      if (closes > opens) {
        rest = last + rest;
        url = url.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return { url, rest };
}

function looksLikeUrl(label: string): boolean {
  return /:\/\//.test(label) || /^www\./i.test(label.trim());
}

export function splitLinks(text: string): LinkPart[] {
  const parts: LinkPart[] = [];
  let last = 0;
  const push = (p: LinkPart) => {
    if (p.type === "text") {
      if (p.text === "") return;
      const prev = parts[parts.length - 1];
      if (prev && prev.type === "text") {
        prev.text += p.text; // keep text runs together
        return;
      }
    }
    parts.push(p);
  };
  const re = new RegExp(LINK_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    push({ type: "text", text: text.slice(last, m.index) });
    last = m.index + m[0].length;

    if (m[2] !== undefined) {
      // markdown link
      const href = toSafeHttpUrl(m[2]);
      if (!href) {
        push({ type: "text", text: m[0] });
        continue;
      }
      // "[https://good.com](https://evil.com)" must not show a URL that is not the target
      const label = looksLikeUrl(m[1]) ? href : m[1];
      push({ type: "link", text: label, href });
      continue;
    }

    const { url, rest } = trimTrailing(m[3]);
    const href = toSafeHttpUrl(url);
    if (!href) {
      push({ type: "text", text: m[0] });
      continue;
    }
    push({ type: "link", text: url, href });
    push({ type: "text", text: rest });
  }
  push({ type: "text", text: text.slice(last) });
  return parts;
}

// ---- server side: only keep links to hosts the bot was actually given ----

function hostOf(url: string): string | null {
  const safe = toSafeHttpUrl(url);
  if (!safe) return null;
  return new URL(safe).hostname.toLowerCase().replace(/^www\./, "");
}

// All hosts mentioned as http(s) URLs in `text` (the system prompt).
export function extractHosts(text: string): Set<string> {
  const hosts = new Set<string>();
  const re = /https?:\/\/[^\s<>"'`)\]]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const h = hostOf(trimTrailing(m[0]).url);
    if (h) hosts.add(h);
  }
  return hosts;
}

export function isHostAllowed(host: string, allowed: Set<string>): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const a of allowed) {
    if (h === a || h.endsWith("." + a)) return true;
  }
  return false;
}

// Removes links whose host is not in `allowed`. Markdown links keep their label;
// bare URLs become "(link removed)". Everything else is untouched.
export function restrictReplyLinks(reply: string, allowed: Set<string>): string {
  const re = new RegExp(LINK_RE.source, "gi");
  return reply.replace(re, (whole, label: string | undefined, mdUrl: string | undefined, bare: string | undefined) => {
    if (mdUrl !== undefined) {
      const h = hostOf(mdUrl);
      if (h && isHostAllowed(h, allowed)) return whole;
      return label ?? "";
    }
    const { url, rest } = trimTrailing(bare ?? "");
    const h = hostOf(url);
    if (h && isHostAllowed(h, allowed)) return whole;
    return "(link removed)" + rest;
  });
}
