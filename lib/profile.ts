export const PROFILE_SIGNATURE_WINDOW_SECONDS = 5 * 60;

const PROFILE_FIELD_KEYS = [
  "display_name",
  "avatar_url",
  "bio",
  "website",
  "cover_url"
] as const;

export type ProfileUpdateFields = Partial<
  Record<(typeof PROFILE_FIELD_KEYS)[number], string | null>
>;

export type ProfileUpdateMessagePayload = {
  address: string;
  updates: ProfileUpdateFields;
  timestamp: number;
};

export function normalizeProfileUpdates(
  updates: Record<string, unknown>
): ProfileUpdateFields {
  if (!updates || typeof updates !== "object") {
    return {};
  }
  const normalized: ProfileUpdateFields = {};
  PROFILE_FIELD_KEYS.forEach((key) => {
    if (updates[key] === undefined) {
      return;
    }
    const value = updates[key];
    if (value === null) {
      normalized[key] = null;
      return;
    }
    const valueString = String(value).trim();
    normalized[key] = valueString === "" ? null : valueString;
  });
  return normalized;
}

export function hasProfileUpdates(updates: ProfileUpdateFields) {
  return Object.keys(updates).length > 0;
}

export function mergeProfileUpdates(
  base: Record<string, unknown>,
  updates: ProfileUpdateFields
) {
  const next = { ...base };
  PROFILE_FIELD_KEYS.forEach((key) => {
    if (updates[key] !== undefined) {
      next[key] = updates[key];
    }
  });
  return next;
}

export function buildProfileUpdateMessage({
  address,
  updates,
  timestamp
}: ProfileUpdateMessagePayload) {
  const lines = [
    "PolkaProof Profile Update",
    `Address: ${address}`,
    `Timestamp: ${timestamp}`
  ];

  const updateKeys = PROFILE_FIELD_KEYS.filter(
    (key) => updates[key] !== undefined
  );

  updateKeys.forEach((key) => {
    const label = humanizeProfileField(key);
    const value = updates[key];
    lines.push(`${label}: ${value ?? ""}`);
  });

  return lines.join("\n");
}

function humanizeProfileField(
  key: (typeof PROFILE_FIELD_KEYS)[number]
): string {
  switch (key) {
    case "display_name":
      return "Display Name";
    case "avatar_url":
      return "Avatar URL";
    case "bio":
      return "Bio";
    case "website":
      return "Website";
    case "cover_url":
      return "Cover URL";
    default:
      return key;
  }
}
