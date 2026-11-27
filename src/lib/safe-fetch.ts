// Server-only. SSRF-safe replacement for fetch() on USER-SUPPLIED URLs
// (bot crawler, sitemap tools, meta checker, Shopify import).
//
// What it enforces:
//  - http/https only, no user:pass@ in the URL, ports 80/443 only
//  - blocks localhost / single-label / .local / .internal style hostnames
//  - blocks private, loopback, link-local, CGNAT, multicast, reserved IPv4/IPv6
//    (incl. IPv4-mapped / NAT64 / 6to4 IPv6 forms and cloud metadata 169.254.169.254)
//  - DNS is resolved INSIDE the socket connect (custom `lookup`), so the IP that
//    is checked is the IP that is connected to (no DNS-rebinding gap); if ANY
//    resolved address is blocked, the request is refused
//  - redirects are followed manually (max 4) and every hop is re-validated
//  - total time limit, response size limit (after decompression), content-type filter
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";

export type SafeFetchErrorCode =
  | "invalid_url"
  | "blocked"
  | "timeout"
  | "too_many_redirects"
  | "network";

export class SafeFetchError extends Error {
  code: SafeFetchErrorCode;
  constructor(code: SafeFetchErrorCode, message: string) {
    super(message);
    this.name = "SafeFetchError";
    this.code = code;
  }
}

// ---------- IP checks (pure, unit-tested) ----------

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

function isBlockedIPv4Octets(o: number[]): boolean {
  const [a, b, c] = o;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

// Expands an IPv6 string into 8 16-bit groups (handles "::" and a dotted IPv4 tail).
function parseIPv6(input: string): number[] | null {
  let ip = input;
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  if (!ip.includes(":")) return null;

  let tail: number[] = [];
  const lastColon = ip.lastIndexOf(":");
  const lastPart = ip.slice(lastColon + 1);
  if (lastPart.includes(".")) {
    const v4 = parseIPv4(lastPart);
    if (!v4) return null;
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]];
    ip = ip.slice(0, lastColon + 1) + "0:0"; // placeholder groups, replaced below
  }

  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const toGroups = (s: string): number[] | null => {
    if (s === "") return [];
    const out: number[] = [];
    for (const g of s.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = toGroups(halves[0]);
  if (!head) return null;
  let groups: number[];
  if (halves.length === 2) {
    const rest = toGroups(halves[1]);
    if (!rest) return null;
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array(missing).fill(0), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  if (tail.length === 2) {
    groups[6] = tail[0];
    groups[7] = tail[1];
  }
  return groups;
}

function v4FromGroups(hi: number, lo: number): number[] {
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255];
}

// true = this address must NOT be connected to. Unparseable input is blocked.
export function isBlockedIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const o = parseIPv4(ip);
    return !o || isBlockedIPv4Octets(o);
  }
  if (v === 6) {
    const g = parseIPv6(ip);
    if (!g) return true;
    // :: and ::1
    if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true;
    // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
      return isBlockedIPv4Octets(v4FromGroups(g[6], g[7]));
    }
    // NAT64 64:ff9b::/96 (embedded v4) and local-use 64:ff9b:1::/48
    if (g[0] === 0x64 && g[1] === 0xff9b) {
      if (g[2] === 1) return true;
      if (g.slice(2, 6).every((x) => x === 0)) return isBlockedIPv4Octets(v4FromGroups(g[6], g[7]));
      return true;
    }
    if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // discard 100::/64
    if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo 2001::/32
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
    if (g[0] === 0x2002) return isBlockedIPv4Octets(v4FromGroups(g[1], g[2])); // 6to4
    if ((g[0] & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
    if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
    if ((g[0] & 0xffc0) === 0xfec0) return true; // site-local (deprecated)
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    return false;
  }
  return true;
}

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".localdomain",
  ".home.arpa",
  ".lan",
  ".intranet",
  ".corp",
];

export type UrlPolicy = {
  allowedPorts: number[] | null; // null = any port (tests only)
  checkHostnames: boolean; // block localhost / single-label / .local style names
  isIpAllowed: (ip: string) => boolean;
};

export const STRICT_POLICY: UrlPolicy = {
  allowedPorts: [80, 443],
  checkHostnames: true,
  isIpAllowed: (ip) => !isBlockedIp(ip),
};

// Syntax-level validation (no DNS). Returns the parsed URL or throws SafeFetchError.
export function validateUrlSyntax(input: string | URL, policy: UrlPolicy = STRICT_POLICY): URL {
  let url: URL;
  try {
    url = typeof input === "string" ? new URL(input) : new URL(input.toString());
  } catch {
    throw new SafeFetchError("invalid_url", "That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeFetchError("invalid_url", "Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new SafeFetchError("invalid_url", "URLs with a username or password are not allowed.");
  }
  if (policy.allowedPorts) {
    const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
    if (!policy.allowedPorts.includes(port)) {
      throw new SafeFetchError("blocked", "That port is not allowed.");
    }
  }
  let host = url.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  host = host.replace(/\.$/, "");
  if (!host) throw new SafeFetchError("invalid_url", "That doesn't look like a valid URL.");

  if (net.isIP(host)) {
    if (!policy.isIpAllowed(host)) {
      throw new SafeFetchError("blocked", "That address is not allowed.");
    }
    return url;
  }
  if (policy.checkHostnames) {
    // Real (public) hostnames always contain a dot; "intranet", "router" etc. do not.
    if (host === "localhost" || !host.includes(".")) {
      throw new SafeFetchError("blocked", "That address is not allowed.");
    }
    if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
      throw new SafeFetchError("blocked", "That address is not allowed.");
    }
  }
  return url;
}

// ---------- fetch ----------

export type SafeFetchOptions = {
  headers?: Record<string, string>;
  maxBytes?: number; // decompressed body cap; default 1.5 MB
  timeoutMs?: number; // TOTAL time incl. redirects; default 8000
  maxRedirects?: number; // default 4
  // If set and the response content-type does not match, the body is NOT read
  // (result.bodySkipped = true, text = "").
  requireContentType?: RegExp;
};

export type SafeFetchResult = {
  ok: boolean; // 2xx
  status: number;
  url: string; // final URL after redirects
  contentType: string;
  text: string;
  truncated: boolean;
  bodySkipped: boolean;
};

type Hop =
  | { kind: "redirect"; location: string }
  | { kind: "done"; status: number; contentType: string; text: string; truncated: boolean; bodySkipped: boolean };

function makeLookup(policy: UrlPolicy) {
  return (
    hostname: string,
    options: dns.LookupOptions | number | undefined,
    callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
  ) => {
    const wantAll = typeof options === "object" && options !== null && options.all === true;
    dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
      if (err) return callback(err, "", 4);
      if (!addrs || addrs.length === 0) {
        return callback(new SafeFetchError("network", "DNS lookup failed") as NodeJS.ErrnoException, "", 4);
      }
      if (!addrs.every((a) => policy.isIpAllowed(a.address))) {
        return callback(new SafeFetchError("blocked", "That address is not allowed.") as NodeJS.ErrnoException, "", 4);
      }
      if (wantAll) return callback(null, addrs);
      callback(null, addrs[0].address, addrs[0].family);
    });
  };
}

function decoderFor(encoding: string): zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress | null {
  const e = encoding.trim().toLowerCase();
  if (e === "gzip" || e === "x-gzip") return zlib.createGunzip();
  if (e === "deflate") return zlib.createInflate();
  if (e === "br") return zlib.createBrotliDecompress();
  return null;
}

function requestOnce(
  url: URL,
  opts: Required<Pick<SafeFetchOptions, "maxBytes">> & SafeFetchOptions,
  policy: UrlPolicy,
  remainingMs: number
): Promise<Hop> {
  return new Promise<Hop>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        agent: false,
        lookup: makeLookup(policy) as unknown as net.LookupFunction,
        headers: {
          "User-Agent": "SiteFlow-Fetcher/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml,application/json,text/csv,text/plain;q=0.9,*/*;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          ...(opts.headers ?? {}),
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          return finish(() => resolve({ kind: "redirect", location }));
        }

        const contentType = String(res.headers["content-type"] ?? "");
        if (opts.requireContentType && !opts.requireContentType.test(contentType)) {
          res.destroy();
          return finish(() =>
            resolve({ kind: "done", status, contentType, text: "", truncated: false, bodySkipped: true })
          );
        }

        const decoder = decoderFor(String(res.headers["content-encoding"] ?? ""));
        const source: Readable = decoder ? res.pipe(decoder) : res;
        const chunks: Buffer[] = [];
        let total = 0;
        let truncated = false;

        const done = () => {
          const buf = Buffer.concat(chunks);
          const charsetMatch = /charset\s*=\s*"?([\w-]+)"?/i.exec(contentType);
          let text: string;
          try {
            text = new TextDecoder(charsetMatch?.[1] ?? "utf-8").decode(buf);
          } catch {
            text = new TextDecoder("utf-8").decode(buf);
          }
          finish(() => resolve({ kind: "done", status, contentType, text, truncated, bodySkipped: false }));
        };

        source.on("data", (chunk: Buffer) => {
          if (settled) return;
          const room = opts.maxBytes - total;
          if (chunk.length >= room) {
            if (room > 0) chunks.push(chunk.subarray(0, room));
            total = opts.maxBytes;
            truncated = true;
            res.destroy();
            source.destroy();
            return done();
          }
          chunks.push(chunk);
          total += chunk.length;
        });
        source.on("end", done);
        source.on("error", (err) => {
          if (truncated) return;
          finish(() => reject(new SafeFetchError("network", `Read error: ${(err as Error).message}`)));
        });
        res.on("error", (err) => {
          if (truncated) return;
          finish(() => reject(new SafeFetchError("network", `Read error: ${(err as Error).message}`)));
        });
      }
    );

    const timer = setTimeout(() => {
      req.destroy();
      finish(() => reject(new SafeFetchError("timeout", "The request took too long.")));
    }, Math.max(1, remainingMs));

    req.on("error", (err) => {
      if (err instanceof SafeFetchError) return finish(() => reject(err));
      const inner = (err as { cause?: unknown }).cause;
      if (inner instanceof SafeFetchError) return finish(() => reject(inner));
      finish(() => reject(new SafeFetchError("network", `Network error: ${err.message}`)));
    });
    req.end();
  });
}

export function createSafeFetch(policy: UrlPolicy) {
  return async function safeFetchWithPolicy(
    input: string | URL,
    options: SafeFetchOptions = {}
  ): Promise<SafeFetchResult> {
    const maxRedirects = options.maxRedirects ?? 4;
    const deadline = Date.now() + (options.timeoutMs ?? 8000);
    const opts = { ...options, maxBytes: options.maxBytes ?? 1_500_000 };

    let current = validateUrlSyntax(input, policy);
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new SafeFetchError("timeout", "The request took too long.");
      const result = await requestOnce(current, opts, policy, remaining);
      if (result.kind === "done") {
        return {
          ok: result.status >= 200 && result.status < 300,
          status: result.status,
          url: current.toString(),
          contentType: result.contentType,
          text: result.text,
          truncated: result.truncated,
          bodySkipped: result.bodySkipped,
        };
      }
      let next: URL;
      try {
        next = new URL(result.location, current);
      } catch {
        throw new SafeFetchError("invalid_url", "Bad redirect target.");
      }
      current = validateUrlSyntax(next, policy);
    }
    throw new SafeFetchError("too_many_redirects", "Too many redirects.");
  };
}

// The one to use everywhere for user-supplied URLs.
export const safeFetch = createSafeFetch(STRICT_POLICY);

// Convenience for routes: true if the URL would pass the syntax-level checks.
export function isSafeUrlSyntax(input: string): boolean {
  try {
    validateUrlSyntax(input);
    return true;
  } catch {
    return false;
  }
}
