import { NextRequest, NextResponse } from "next/server";
import { getEventByIdentifier } from "@/lib/events";
import { supabaseServiceClient } from "@/lib/supabase";

type Params = {
  params: { id: string };
};

export async function GET(req: NextRequest, { params }: Params) {
  if (!supabaseServiceClient) {
    return NextResponse.json(
      { error: "service client unavailable" },
      { status: 500 }
    );
  }

  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { error: "address query parameter is required" },
      { status: 400 }
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

  const { data, error } = await supabaseServiceClient
    .from("event_attendance")
    .select("status, verified_at")
    .eq("event_id", event.id)
    .eq("address", address)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ registered: false });
  }

  return NextResponse.json({
    registered: true,
    status: data.status,
    verifiedAt: data.verified_at
  });
}
