export type BadgeCollectionConfig = {
  name: string;
  description: string;
  image?: string;
};

export type BadgeConfig = {
  rpcEndpoint?: string;
  adminMnemonic?: string;
  collectionId?: string;
  collection: BadgeCollectionConfig;
  organizerKey?: string;
};

export function getBadgeConfig(): BadgeConfig {
  return {
    rpcEndpoint: process.env.BADGE_RPC_ENDPOINT,
    adminMnemonic: process.env.BADGE_ADMIN_MNEMONIC,
    collectionId: process.env.BADGE_COLLECTION_ID ?? undefined,
    organizerKey:
      process.env.BADGE_ORGANIZER_KEY ?? process.env.ORGANIZER_API_KEY,
    collection: {
      name:
        process.env.BADGE_COLLECTION_NAME ??
        "PolkaProof Participation Badges",
      description:
        process.env.BADGE_COLLECTION_DESCRIPTION ??
        "Automatically issued after verified attendance.",
      image: process.env.BADGE_COLLECTION_IMAGE ?? undefined
    }
  };
}

export function resolveOrganizerKey() {
  const config = getBadgeConfig();
  return config.organizerKey;
}
