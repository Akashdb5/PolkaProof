import type { NextRequest } from "next/server";
import { resolveOrganizerKey } from "./badges/config";

export function isOrganizerRequest(req: NextRequest) {
  const requiredKey = resolveOrganizerKey();
  if (!requiredKey) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  const headerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;
  const apiKeyHeader = req.headers.get("x-api-key");

  return requiredKey === headerToken || requiredKey === apiKeyHeader;
}
