import { NextRequest, NextResponse } from "next/server";
import { badgeService } from "@/lib/badges/service";
import { isOrganizerRequest } from "@/lib/api-auth";
import { persistMintedBadge } from "@/lib/badges/persistence";
import { getEventByIdentifier } from "@/lib/events";

export async function POST(req: NextRequest) {
  if (!isOrganizerRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const {
    participantAddress,
    participantName,
    eventId,
    eventName,
    imageCid,
    imageBase64,
    metadata
  } = body ?? {};

  if (!participantAddress || !participantName) {
    return NextResponse.json(
      { error: "participantAddress and participantName are required" },
      { status: 400 }
    );
  }

  let resolvedEventName = eventName;
  let resolvedEventId: string | null | undefined = eventId;
  if (eventId && !eventName) {
    const eventRecord = await getEventByIdentifier(eventId).catch(() => null);
    if (eventRecord) {
      resolvedEventName = eventRecord.title ?? eventName;
      resolvedEventId = eventRecord.id;
    }
  }

  if (!resolvedEventName) {
    resolvedEventName = "PolkaProof Event";
  }

  try {
    await badgeService.ensureReady();
    const result = await badgeService.mintBadge({
      participantAddress,
      participantName,
      eventName: resolvedEventName,
      eventId: resolvedEventId,
      imageCid,
      imageBase64,
      metadata
    });

    await persistMintedBadge(result);

    return NextResponse.json({
      success: true,
      badge: result
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "mint failed" },
      { status: 500 }
    );
  }
}
