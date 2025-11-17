import { NextRequest, NextResponse } from "next/server";
import { getEventByIdentifier } from "@/lib/events";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEventByIdentifier(params.id);
    if (!event) {
      return NextResponse.json({ error: "event not found" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "failed to fetch event" },
      { status: 500 }
    );
  }
}
