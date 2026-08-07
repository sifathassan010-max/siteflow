import { NextResponse } from "next/server";

// Simple health check to confirm serverless functions are deploying correctly.
// Visit /api/health once live on Vercel to verify.
export async function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
