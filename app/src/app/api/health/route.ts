import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { connection } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = { db: "fail", valkey: "fail" };

  try {
    await pool().query("SELECT 1");
    checks.db = "ok";
  } catch {
    /* reste "fail" */
  }
  try {
    // Borne le ping : ioredis (maxRetriesPerRequest:null, requis par BullMQ) attendrait
    // sinon indéfiniment si Valkey est injoignable. On échoue vite à la place.
    const pong = await Promise.race([
      connection().ping(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
    ]);
    checks.valkey = pong === "PONG" ? "ok" : "fail";
  } catch {
    /* reste "fail" */
  }

  const healthy = Object.values(checks).every((s) => s === "ok");
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
