import { NextRequest, NextResponse } from "next/server";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";
import { supabaseReadClient, supabaseServiceClient } from "@/lib/supabase";
import {
  buildProfileUpdateMessage,
  hasProfileUpdates,
  mergeProfileUpdates,
  normalizeProfileUpdates,
  PROFILE_SIGNATURE_WINDOW_SECONDS
} from "@/lib/profile";

let cryptoReadyPromise: Promise<boolean> | null = null;

function ensureCryptoReady() {
  if (!cryptoReadyPromise) {
    cryptoReadyPromise = cryptoWaitReady().catch((error) => {
      cryptoReadyPromise = null;
      throw error;
    });
  }
  return cryptoReadyPromise;
}

function isTimestampFresh(timestamp: number) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return (
    Math.abs(nowSeconds - timestamp) <= PROFILE_SIGNATURE_WINDOW_SECONDS
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  if (!supabaseReadClient) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const [profile, badges] = await Promise.all([
    supabaseReadClient
      .from("profiles")
      .select("*")
      .eq("address", params.address)
      .maybeSingle(),
    supabaseReadClient
      .from("badges")
      .select("*")
      .eq("address", params.address)
      .order("issued_at", { ascending: false })
  ]);

  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }
  if (badges.error) {
    return NextResponse.json({ error: badges.error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: profile.data,
    badges: badges.data
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  if (!supabaseServiceClient) {
    return NextResponse.json(
      { error: "Supabase service client unavailable" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const signature = body?.signature;
  const message = body?.message;
  const timestamp = Number(body?.timestamp);
  const rawUpdates = body?.updates ?? {};

  if (!signature || !message || !Number.isFinite(timestamp)) {
    return NextResponse.json(
      { error: "signature, message, and timestamp are required" },
      { status: 400 }
    );
  }

  if (!isTimestampFresh(timestamp)) {
    return NextResponse.json({ error: "stale timestamp" }, { status: 400 });
  }

  const normalizedUpdates = normalizeProfileUpdates(rawUpdates);
  if (!hasProfileUpdates(normalizedUpdates)) {
    return NextResponse.json(
      { error: "no profile fields provided" },
      { status: 400 }
    );
  }

  const canonicalMessage = buildProfileUpdateMessage({
    address: params.address,
    updates: normalizedUpdates,
    timestamp
  });

  if (canonicalMessage !== message) {
    return NextResponse.json(
      { error: "message contents do not match payload" },
      { status: 400 }
    );
  }

  await ensureCryptoReady();
  const verification = signatureVerify(message, signature, params.address);
  if (!verification.isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const payload = mergeProfileUpdates(
    {
      address: params.address,
      updated_at: new Date().toISOString()
    },
    normalizedUpdates
  );

  const { data, error } = await supabaseServiceClient
    .from("profiles")
    .upsert(payload, { onConflict: "address" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
