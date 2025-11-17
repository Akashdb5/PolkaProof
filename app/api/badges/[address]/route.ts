import { NextRequest, NextResponse } from "next/server";
import { supabaseReadClient } from "@/lib/supabase";

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

  const { data, error } = await supabaseReadClient
    .from("badges")
    .select("*")
    .eq("address", params.address)
    .order("issued_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ badges: data ?? [] });
}
