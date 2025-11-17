import { NextRequest, NextResponse } from "next/server";
import { supabaseServiceClient } from "@/lib/supabase";

const organizerKey = process.env.ORGANIZER_API_KEY;

export async function POST(req: NextRequest) {
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid or missing JSON body" },
      { status: 400 }
    );
  }

  const { title, start_at, end_at, deadline, organizer_id, slug, tags } = body;
  if (!title || !organizer_id) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data, error } = await supabaseServiceClient
    .from("events")
    .insert({
      title,
      slug,
      organizer_id,
      start_at,
      end_at,
      deadline,
      description: body.description,
      location: body.location,
      banner_url: body.banner_url,
      tags: Array.isArray(tags) ? tags : [],
      metadata: body.metadata ?? {}
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
