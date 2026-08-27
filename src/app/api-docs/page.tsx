import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/nav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "API Docs — SiteFlow",
  description:
    "Call SiteFlow's chatbot, SEO, forms, and analytics tools programmatically with an API key. Endpoint reference, auth, and example requests.",
  alternates: { canonical: "/api-docs" },
  robots: { index: true, follow: true },
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 text-xs leading-relaxed text-white">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  plan,
  description,
  request,
  response,
}: {
  method: "GET" | "POST";
  path: string;
  plan: string;
  description: string;
  request: string;
  response: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            "rounded-md px-2 py-0.5 text-xs font-bold " +
            (method === "GET" ? "bg-brand-bg text-brand" : "bg-ink text-white")
          }
        >
          {method}
        </span>
        <code className="text-sm font-semibold text-ink">{path}</code>
        <span className="ml-auto rounded-full border border-line px-2.5 py-0.5 text-xs text-slate">
          Requires: {plan}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate">{description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate">Request</p>
      <CodeBlock>{request}</CodeBlock>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate">Response</p>
      <CodeBlock>{response}</CodeBlock>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">API docs</h1>
        <p className="mt-3 text-slate">
          Call SiteFlow&apos;s chatbot, SEO, forms, and analytics tools
          directly — from a script, backend, or AI agent — instead of
          through the dashboard. Each tool has its own API plan; see{" "}
          <Link href="/pricing#api" className="text-brand underline">
            API pricing
          </Link>
          .
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Authentication</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Every request needs an API key in the{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">Authorization</code>{" "}
            header. Generate one from{" "}
            <Link href="/dashboard/settings/api-keys" className="text-brand underline">
              Dashboard → API keys
            </Link>{" "}
            once you have an active API plan — the raw key is shown once at
            creation time, so save it somewhere safe.
          </p>
          <CodeBlock>{`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxx`}</CodeBlock>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Rate limits &amp; quotas</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Each tool&apos;s API plan includes 1,000 calls per calendar
            month, reset on the 1st. Calling an endpoint your account
            hasn&apos;t subscribed to, or going over quota, returns{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">402</code> with an
            explanation in the response body. There&apos;s no overage
            billing — once you hit the cap for a tool, that tool&apos;s
            calls simply stop working until the plan renews or you upgrade.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Endpoints</h2>
          <div className="mt-4 flex flex-col gap-6">
            <Endpoint
              method="POST"
              path="/api/v1/seo/analyze"
              plan="SEO API or All Access API"
              description="Runs a single-page SEO audit — the same scoring the dashboard SEO tool uses — and returns it as structured JSON."
              request={`curl -X POST https://siteflow-omega.vercel.app/api/v1/seo/analyze \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://example.com" }'`}
              response={`{
  "url": "https://example.com",
  "statusCode": 200,
  "score": 82,
  "title": "Example Domain",
  "metaDescription": "",
  "h1Count": 1,
  "wordCount": 240,
  "imagesTotal": 3,
  "imagesMissingAlt": 1,
  "hasCanonical": true,
  "hasOgTags": false,
  "hasViewport": true,
  "issues": ["Missing meta description", "1 image missing alt text"]
}`}
            />

            <Endpoint
              method="POST"
              path="/api/v1/chatbot/query"
              plan="Chatbot API or All Access API"
              description="Sends a one-off message to one of YOUR OWN trained bots (created in the dashboard chatbot builder) and returns its reply. Doesn't create or configure bots — that still happens in the dashboard."
              request={`curl -X POST https://siteflow-omega.vercel.app/api/v1/chatbot/query \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "botId": "your-bot-id", "message": "What are your hours?" }'`}
              response={`{ "reply": "We're open Monday–Friday, 9am–6pm." }`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/forms/submissions?formId=...&limit=20"
              plan="Forms API or All Access API"
              description="Returns recent submissions for one of YOUR OWN forms (created in the dashboard forms builder). limit is optional, max 100, defaults to 20."
              request={`curl "https://siteflow-omega.vercel.app/api/v1/forms/submissions?formId=your-form-id&limit=10" \\
  -H "Authorization: Bearer sk_live_..."`}
              response={`{
  "form": { "id": "your-form-id", "name": "Contact form" },
  "count": 2,
  "submissions": [
    { "id": "...", "data": { "name": "Jane", "email": "jane@example.com" }, "created_at": "..." }
  ]
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/analytics/summary?siteId=...&days=7"
              plan="Analytics API or All Access API"
              description="Returns pageviews, unique visitors, and top pages for one of YOUR OWN analytics sites (created in the dashboard analytics tool) over the given window. days is optional, max 90, defaults to 7."
              request={`curl "https://siteflow-omega.vercel.app/api/v1/analytics/summary?siteId=your-site-id&days=30" \\
  -H "Authorization: Bearer sk_live_..."`}
              response={`{
  "site": { "id": "your-site-id", "name": "My site", "domain": "example.com" },
  "windowDays": 30,
  "pageviews": 1240,
  "uniqueVisitors": 318,
  "topPages": [{ "path": "/", "views": 402 }]
}`}
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">Errors</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Every error response is JSON with an{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">error</code> field
            explaining what went wrong.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
            <li><code className="rounded bg-canvas px-1.5 py-0.5 text-xs">401</code> — missing, invalid, or revoked API key</li>
            <li><code className="rounded bg-canvas px-1.5 py-0.5 text-xs">402</code> — no active plan for this tool, or monthly quota exceeded</li>
            <li><code className="rounded bg-canvas px-1.5 py-0.5 text-xs">404</code> — the botId/formId/siteId doesn&apos;t exist on your account</li>
            <li><code className="rounded bg-canvas px-1.5 py-0.5 text-xs">400</code> — missing or invalid request fields</li>
          </ul>
        </section>

        <p className="mt-10 text-sm text-slate">
          Questions about the API? Reach out — see{" "}
          <Link href="/trust" className="text-brand underline">
            Contact / Support
          </Link>{" "}
          in the footer.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
