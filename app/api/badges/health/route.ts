import { NextResponse } from "next/server";
import { badgeService } from "@/lib/badges/service";

export async function GET() {
  try {
    await badgeService.ensureReady();
  } catch {
    // ignore connection errors; health endpoint will reflect status below
  }

  const health = await badgeService.getHealth();
  return NextResponse.json({ success: true, data: health });
}
