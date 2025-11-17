import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getEventByIdentifier } from "@/lib/events";
import { supabaseServiceClient } from "@/lib/supabase";

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseServiceClient) {
    return NextResponse.json(
      { error: "service client unavailable" },
      { status: 500 }
    );
  }

  let event;
  try {
    event = await getEventByIdentifier(params.id);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "failed to resolve event" },
      { status: 500 }
    );
  }
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomUUID();

  const { error } = await supabaseServiceClient.from("nonces").insert({
    value: nonce,
    event_id: event.id,
    expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString()
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    eventId: event.id,
    timestamp,
    nonce
  });
}
