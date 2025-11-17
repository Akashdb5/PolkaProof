import { NextResponse } from "next/server";
import { supabaseReadClient } from "@/lib/supabase";

export async function GET() {
  if (supabaseReadClient) {
    const { data, error } = await supabaseReadClient
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // fallback stub
  return NextResponse.json([]);
}
