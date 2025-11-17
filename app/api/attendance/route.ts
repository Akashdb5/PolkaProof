import { NextRequest, NextResponse } from "next/server";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";
import {
  extractNonce,
  extractTimestamp,
  validateMessageShape
} from "@/lib/messages";
import { supabaseServiceClient } from "@/lib/supabase";

let cryptoReadyPromise: Promise<boolean> | null = null;

function ensureCryptoReady() {
  if (!cryptoReadyPromise) {
    cryptoReadyPromise = cryptoWaitReady().catch((err) => {
      cryptoReadyPromise = null;
      throw err;
    });
  }
  return cryptoReadyPromise;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const address = body?.address;
  const signature = body?.signature;
  const message = body?.message;
  const eventId = body?.eventId;
  const evmAddress = body?.evmAddress ? String(body.evmAddress).trim() : null;

  if (!address || !signature || !message || !eventId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const nonce = extractNonce(message);
  const timestamp = extractTimestamp(message);
  if (!nonce || !timestamp) {
    return NextResponse.json({ error: "invalid message" }, { status: 400 });
  }

  if (
    !validateMessageShape(message, {
      eventId,
      address,
      nonce,
      timestamp
    })
  ) {
    return NextResponse.json({ error: "message tampered" }, { status: 400 });
  }

  await ensureCryptoReady();
  const verification = signatureVerify(message, signature, address);
  if (!verification.isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (supabaseServiceClient) {
    const { data: nonceRow, error: nonceError } = await supabaseServiceClient
      .from("nonces")
      .select("*")
      .eq("value", nonce)
      .single();

    if (nonceError || !nonceRow) {
      return NextResponse.json({ error: "nonce not found" }, { status: 400 });
    }

    if (nonceRow.consumed_at) {
      return NextResponse.json({ error: "nonce already used" }, { status: 409 });
    }

    if (new Date(nonceRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "nonce expired" }, { status: 400 });
    }

    const issuedAt = new Date(timestamp * 1000).toISOString();

    await supabaseServiceClient
      .from("profiles")
      .upsert(
        { address, evm_address: evmAddress || undefined },
        { onConflict: "address" }
      );

    const { data: existingAttendance, error: lookupError } =
      await supabaseServiceClient
        .from("event_attendance")
        .select("id")
        .eq("event_id", eventId)
        .eq("address", address)
        .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: lookupError.message },
        { status: 500 }
      );
    }

    if (existingAttendance) {
      return NextResponse.json(
        { error: "already checked in" },
        { status: 409 }
      );
    }

    const metadata = evmAddress ? { evm_address: evmAddress } : {};

    const { error: insertError } = await supabaseServiceClient
      .from("event_attendance")
      .insert({
        event_id: eventId,
        address,
        signature,
        signed_message: message,
        nonce,
        issued_at: issuedAt,
        verified_at: new Date().toISOString(),
        status: "confirmed",
        metadata
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "already checked in" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    await supabaseServiceClient
      .from("nonces")
      .update({ consumed_at: new Date().toISOString() })
      .eq("value", nonce);
  }

  return NextResponse.json({ ok: true });
}
