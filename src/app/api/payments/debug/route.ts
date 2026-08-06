import { NextRequest, NextResponse } from "next/server";
import {
  clearPayLogs,
  getPayLogs,
  payLog,
  paymentConfigSnapshot,
} from "@/lib/pay-log";

export const dynamic = "force-dynamic";

/** Inspect recent payment logs + env presence (no secrets). */
export async function GET() {
  const config = paymentConfigSnapshot();
  payLog("debug", "Debug endpoint polled", config);
  return NextResponse.json({
    ok: true,
    config,
    logs: getPayLogs(),
    tip: "Watch these logs while paying. Local webhooks need ngrok pointing to /api/payments/webhook — polling still confirms payment without webhook.",
  });
}

export async function DELETE(req: NextRequest) {
  const confirm = req.nextUrl.searchParams.get("confirm");
  if (confirm !== "1") {
    return NextResponse.json({ error: "Pass ?confirm=1 to clear" }, { status: 400 });
  }
  clearPayLogs();
  return NextResponse.json({ ok: true, cleared: true });
}
