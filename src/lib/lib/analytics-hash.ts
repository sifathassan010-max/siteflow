// Server-only. Produces a one-way hash of (IP + user agent + today's date)
// so we can estimate unique visitors without ever storing a raw IP address,
// and without the hash being usable to track someone across different days.
import { createHash } from "crypto";

export function dailyVisitorHash(ip: string, userAgent: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash("sha256").update(`${ip}|${userAgent}|${today}`).digest("hex");
}
