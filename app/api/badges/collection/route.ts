import { NextRequest, NextResponse } from "next/server";
import { badgeService } from "@/lib/badges/service";
import { isOrganizerRequest } from "@/lib/api-auth";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: badgeService.getCollectionInfo()
  });
}

export async function POST(req: NextRequest) {
  if (!isOrganizerRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await badgeService.createCollection();
    return NextResponse.json({
      success: true,
      data: result,
      message:
        "Collection created. Persist BADGE_COLLECTION_ID in your environment."
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "collection creation failed" },
      { status: 500 }
    );
  }
}
