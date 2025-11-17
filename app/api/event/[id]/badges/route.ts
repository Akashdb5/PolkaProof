import { NextRequest, NextResponse } from "next/server";
import { getEventByIdentifier } from "@/lib/events";
import { supabaseServiceClient } from "@/lib/supabase";

const organizerKey = process.env.ORGANIZER_API_KEY;

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  if (!supabaseServiceClient) {
    return NextResponse.json(
      { error: "service client unavailable" },
      { status: 500 }
    );
  }

  if (!organizerKey) {
    return NextResponse.json(
      { error: "organizer key not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

  if (organizerKey !== apiKeyHeader && organizerKey !== bearerToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const event = await getEventByIdentifier(params.id);
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid or missing JSON body" },
      { status: 400 }
    );
  }

  const { address, image_url, metadata, nft_contract, nft_token_id, mint_tx_hash } =
    body ?? {};

  if (!address) {
    return NextResponse.json(
      { error: "address is required" },
      { status: 400 }
    );
  }

  await supabaseServiceClient
    .from("profiles")
    .upsert({ address }, { onConflict: "address" });

  const { data, error } = await supabaseServiceClient
    .from("badges")
    .insert({
      event_id: event.id,
      address,
      image_url,
      metadata: metadata ?? {},
      nft_contract,
      nft_token_id,
      mint_tx_hash,
      issued_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
