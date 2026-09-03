// MCP server for AI agents. Lives alongside src/app/api/v1/** and exposes
// the SAME four capabilities (seo, analytics, forms, chatbot) over the
// Model Context Protocol instead of plain REST, so an agent can call
// SiteFlow as a tool directly. Same auth (sk_live_ API key), same monthly
// quotas, same ownership checks, same data — just a second protocol in
// front of it. No new features live here.
//
// Endpoint: POST/GET/DELETE /api/mcp (Streamable HTTP transport)
// Auth: Authorization: Bearer sk_live_...  (same key as the REST API)
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyApiKey } from "@/lib/api-keys";
import { checkApiUsageLimit, logApiUsage, type ApiTool } from "@/lib/api-usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzePage } from "@/lib/seo-audit";

const MAX_ANALYTICS_DAYS = 90;
const MAX_SUBMISSIONS_LIMIT = 100;

const TOOL_LABEL: Record<ApiTool, string> = {
  seo: "SEO",
  analytics: "Analytics",
  forms: "Forms",
  chatbot: "Chatbot",
};

function quotaMessage(
  usage: { reason?: "no_plan" | "quota_exceeded" | "key_not_scoped"; used: number; limit: number },
  tool: ApiTool
) {
  if (usage.reason === "no_plan") {
    return `This API key's account doesn't have an active ${TOOL_LABEL[tool]} API plan. Subscribe at siteflow-omega.vercel.app/pricing.`;
  }
  if (usage.reason === "key_not_scoped") {
    return `This API key isn't scoped for the ${TOOL_LABEL[tool]} API. Create a new key with that scope, or use an unscoped key.`;
  }
  return `Monthly quota exceeded (${usage.used}/${usage.limit} calls this month). Resets at the start of next month.`;
}

function textResult(payload: unknown) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

// Every tool needs the userId that authenticated the call. withMcpAuth
// (below) puts it on extra.authInfo.extra.userId.
function requireUserId(extra: { authInfo?: { extra?: Record<string, unknown> } }): string | null {
  const userId = extra.authInfo?.extra?.userId;
  return typeof userId === "string" ? userId : null;
}

// Scopes for the key that authenticated this call — [] means unscoped
// (inherits every tool active on the account), matching src/lib/api-auth.ts.
function requireScopes(extra: { authInfo?: { extra?: Record<string, unknown> } }): ApiTool[] {
  const scopes = extra.authInfo?.extra?.scopes;
  return Array.isArray(scopes) ? (scopes as ApiTool[]) : [];
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "analyze_seo",
      "Runs an on-page SEO audit for a single URL: score, title/meta issues, heading and image checks, word count, canonical/OG/viewport presence. Same audit as SiteFlow's dashboard SEO tool.",
      { url: z.string().url().describe("Full http(s) URL to analyze, e.g. https://example.com") },
      async ({ url }, extra) => {
        const userId = requireUserId(extra);
        if (!userId) return errorResult("Not authenticated.");

        const scopes = requireScopes(extra);
        const usage = await checkApiUsageLimit(userId, "seo", scopes);
        if (!usage.allowed) return errorResult(quotaMessage(usage, "seo"));

        let target: URL;
        try {
          target = new URL(url);
          if (!["http:", "https:"].includes(target.protocol)) throw new Error("bad protocol");
        } catch {
          return errorResult("That doesn't look like a valid http(s) URL.");
        }

        const audit = await analyzePage(target.toString());
        await logApiUsage(userId, "seo", "seo_analyze");

        return textResult({
          url: audit.url,
          statusCode: audit.statusCode,
          score: audit.score,
          title: audit.title,
          metaDescription: audit.metaDescription,
          h1Count: audit.h1Count,
          h1Text: audit.h1Text,
          wordCount: audit.wordCount,
          imagesTotal: audit.imagesTotal,
          imagesMissingAlt: audit.imagesMissingAlt,
          hasCanonical: audit.hasCanonical,
          hasOgTags: audit.hasOgTags,
          hasViewport: audit.hasViewport,
          issues: audit.issues,
        });
      }
    );

    server.tool(
      "get_analytics_summary",
      "Returns pageview/visitor counts and top pages for one of the caller's own SiteFlow analytics sites over a given window (default 7 days, max 90).",
      {
        siteId: z.string().describe("The analytics site id, from the SiteFlow dashboard."),
        days: z
          .number()
          .int()
          .min(1)
          .max(MAX_ANALYTICS_DAYS)
          .optional()
          .describe("Window size in days (1-90). Defaults to 7."),
      },
      async ({ siteId, days }, extra) => {
        const userId = requireUserId(extra);
        if (!userId) return errorResult("Not authenticated.");

        const scopes = requireScopes(extra);
        const usage = await checkApiUsageLimit(userId, "analytics", scopes);
        if (!usage.allowed) return errorResult(quotaMessage(usage, "analytics"));

        const windowDays = days ?? 7;
        const admin = createAdminClient();

        const { data: site } = await admin
          .from("analytics_sites")
          .select("id, name, domain")
          .eq("id", siteId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!site) return errorResult("No analytics site with that id on this account.");

        const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

        const { data: events, error } = await admin
          .from("analytics_events")
          .select("path, visitor_hash, created_at")
          .eq("site_id", siteId)
          .gte("created_at", since);

        if (error) return errorResult(error.message);

        const rows = events ?? [];
        const uniqueVisitors = new Set(rows.map((e) => e.visitor_hash).filter(Boolean)).size;

        const pathCounts = new Map<string, number>();
        for (const e of rows) {
          pathCounts.set(e.path, (pathCounts.get(e.path) ?? 0) + 1);
        }
        const topPages = Array.from(pathCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([path, views]) => ({ path, views }));

        await logApiUsage(userId, "analytics", "analytics_summary");

        return textResult({
          site: { id: site.id, name: site.name, domain: site.domain },
          windowDays,
          pageviews: rows.length,
          uniqueVisitors,
          topPages,
        });
      }
    );

    server.tool(
      "get_form_submissions",
      "Returns recent submissions for one of the caller's own SiteFlow forms (default 20, max 100).",
      {
        formId: z.string().describe("The form id, from the SiteFlow dashboard."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_SUBMISSIONS_LIMIT)
          .optional()
          .describe("Max number of submissions to return (1-100). Defaults to 20."),
      },
      async ({ formId, limit }, extra) => {
        const userId = requireUserId(extra);
        if (!userId) return errorResult("Not authenticated.");

        const scopes = requireScopes(extra);
        const usage = await checkApiUsageLimit(userId, "forms", scopes);
        if (!usage.allowed) return errorResult(quotaMessage(usage, "forms"));

        const admin = createAdminClient();

        const { data: form } = await admin
          .from("forms")
          .select("id, name")
          .eq("id", formId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!form) return errorResult("No form with that id on this account.");

        const { data: submissions, error } = await admin
          .from("form_submissions")
          .select("id, data, created_at")
          .eq("form_id", formId)
          .order("created_at", { ascending: false })
          .limit(limit ?? 20);

        if (error) return errorResult(error.message);

        await logApiUsage(userId, "forms", "forms_submissions");

        return textResult({
          form: { id: form.id, name: form.name },
          count: submissions?.length ?? 0,
          submissions,
        });
      }
    );

    server.tool(
      "query_chatbot",
      "Sends a one-off message to one of the caller's own trained SiteFlow chatbots and returns its reply.",
      {
        botId: z.string().describe("The bot id, from the SiteFlow dashboard."),
        message: z.string().max(500).describe("Message to send to the bot (max 500 characters)."),
      },
      async ({ botId, message }, extra) => {
        const userId = requireUserId(extra);
        if (!userId) return errorResult("Not authenticated.");

        const scopes = requireScopes(extra);
        const usage = await checkApiUsageLimit(userId, "chatbot", scopes);
        if (!usage.allowed) return errorResult(quotaMessage(usage, "chatbot"));

        const admin = createAdminClient();

        const { data: bot } = await admin
          .from("bots")
          .select("id, persona, site_content, model, escalation_contact")
          .eq("id", botId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!bot) return errorResult("No bot with that id on this account.");

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return errorResult("Chatbot isn't configured yet.");

        let systemPrompt = bot.persona as string;
        if (bot.site_content) {
          systemPrompt += `\n\nYou have the following information about the business's website. Use it to answer questions accurately. If something isn't covered by this content, say you're not sure rather than making it up.\n\n--- WEBSITE CONTENT ---\n${bot.site_content}\n--- END WEBSITE CONTENT ---`;
        }
        if (bot.escalation_contact) {
          systemPrompt += `\n\nIf you don't know the answer, tell the user they can reach the business directly at ${bot.escalation_contact} instead of guessing.`;
        }

        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: (bot.model as string) || "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message },
              ],
              max_tokens: 300,
              temperature: 0.7,
            }),
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            console.error("Groq API error (mcp query_chatbot):", res.status, await res.text());
            return errorResult("The chatbot is having trouble right now.");
          }

          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";

          await logApiUsage(userId, "chatbot", "chatbot_query");

          return textResult(reply);
        } catch (err) {
          console.error("mcp query_chatbot error:", err);
          return errorResult("The chatbot is having trouble right now.");
        }
      }
    );
  },
  {},
  { basePath: "/api" }
);

// Resolves "Authorization: Bearer sk_live_..." the same way authenticateApiRequest
// does for the REST routes, and stashes the userId where tool handlers can
// read it back via extra.authInfo.extra.userId.
const verifyToken = async (_req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined;

  const verified = await verifyApiKey(bearerToken);
  if (!verified) return undefined;

  return {
    token: bearerToken,
    clientId: verified.userId,
    scopes: [],
    extra: { userId: verified.userId, keyId: verified.keyId, scopes: verified.scopes },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
