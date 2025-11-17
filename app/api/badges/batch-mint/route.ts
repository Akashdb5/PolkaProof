import { NextRequest, NextResponse } from "next/server";
import { badgeService } from "@/lib/badges/service";
import type { MintBadgeInput } from "@/lib/badges/service";
import { isOrganizerRequest } from "@/lib/api-auth";
import { getEventByIdentifier } from "@/lib/events";
import { persistMintedBadge } from "@/lib/badges/persistence";

type ParticipantPayload = {
  address: string;
  name: string;
  imageCid?: string;
  imageBase64?: string;
  metadata?: Record<string, unknown>;
};

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

  const participants: ParticipantPayload[] = body?.participants;
  const eventId = body?.eventId;
  let eventName = body?.eventName;

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json(
      { error: "participants array is required" },
      { status: 400 }
    );
  }

  if (!eventName && eventId) {
    const eventRecord = await getEventByIdentifier(eventId).catch(() => null);
    if (eventRecord) {
      eventName = eventRecord.title;
    }
  }

  if (!eventName) {
    eventName = "PolkaProof Event";
  }

  const mintInputs: MintBadgeInput[] = participants.map((participant) => ({
    participantAddress: participant.address,
    participantName: participant.name,
    eventId,
    eventName,
    imageCid: participant.imageCid,
    imageBase64: participant.imageBase64,
    metadata: participant.metadata
  }));

  try {
    await badgeService.ensureReady();
    const results = await badgeService.mintBatch(mintInputs);
    await Promise.all(
      results
        .filter(
          (entry): entry is { success: true } & Awaited<
            ReturnType<typeof badgeService.mintBadge>
          > => entry.success
        )
        .map((entry) => persistMintedBadge(entry))
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      summary: { successCount, failCount, total: results.length },
      results
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "batch mint failed" },
      { status: 500 }
    );
  }
}
