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
    const pong = await connection().ping();
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
