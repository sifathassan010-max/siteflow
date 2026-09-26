// MCP server for AI agents. Lives alongside src/app/api/v1/** and exposes
// the SAME capabilities (chatbot) over the
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
import { resolveGroqModel } from "@/lib/groq-models";

const TOOL_LABEL: Record<ApiTool, string> = {
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
              model: resolveGroqModel(bot.model),
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
