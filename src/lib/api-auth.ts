// Server-only. Every route under src/app/api/v1/** calls this first.
import { verifyApiKey } from "@/lib/api-keys";
import type { ApiTool } from "@/lib/api-usage";
import { NextResponse } from "next/server";

export type ApiAuthResult =
  | { ok: true; userId: string; keyId: string; scopes: ApiTool[] }
  | { ok: false; response: NextResponse };

// Reads "Authorization: Bearer sk_live_..." and resolves it to a user id.
// Returns a ready-to-return 401 NextResponse on failure so route handlers
// can just do: `const auth = await authenticateApiRequest(request); if (!auth.ok) return auth.response;`
export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing API key. Send it as: Authorization: Bearer sk_live_..." },
        { status: 401 }
      ),
    };
  }

  const verified = await verifyApiKey(match[1].trim());
  if (!verified) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }),
    };
  }

  return { ok: true, userId: verified.userId, keyId: verified.keyId, scopes: verified.scopes };
}
