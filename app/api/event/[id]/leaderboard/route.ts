import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseClient) {
    return NextResponse.json(
      [
        { address: "5D...", checkins: 5 },
        { address: "5F...", checkins: 3 }
      ],
      { status: 200 }
    );
  }

  const { data, error } = await supabaseClient
    .from("event_leaderboard")
    .select("*")
    .eq("event_id", params.id)
    .order("checkins", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
