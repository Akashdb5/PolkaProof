import { NextRequest, NextResponse } from "next/server";
import { uploadImageBufferToIpfs } from "@/lib/badges/ipfs";
import { isOrganizerRequest } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!isOrganizerRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { imageBase64, filename } = body ?? {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 }
    );
  }

  const safeFilename =
    typeof filename === "string" && filename.trim().length > 0
      ? filename.trim()
      : `badge-${Date.now()}.png`;

  try {
    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const cid = await uploadImageBufferToIpfs(buffer, safeFilename);
    return NextResponse.json({
      success: true,
      cid,
      url: `https://gateway.pinata.cloud/ipfs/${cid}`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "upload failed" },
      { status: 500 }
    );
  }
}
