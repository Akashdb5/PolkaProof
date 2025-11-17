export type ProfileRecord = {
  address: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  cover_url?: string | null;
  evm_address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProfileUpdates = Partial<
  Pick<
    ProfileRecord,
    "display_name" | "avatar_url" | "bio" | "website" | "cover_url"
  >
>;
