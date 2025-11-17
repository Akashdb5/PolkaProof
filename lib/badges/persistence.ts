import { supabaseServiceClient } from "@/lib/supabase";
import type { MintBadgeResult } from "./service";

export async function persistMintedBadge(result: MintBadgeResult) {
  if (!supabaseServiceClient) {
    return;
  }

  await supabaseServiceClient
    .from("profiles")
    .upsert(
      { address: result.participantAddress },
      { onConflict: "address" }
    );

  await supabaseServiceClient.from("badges").insert({
    event_id: result.eventId ?? null,
    address: result.participantAddress,
    image_url: result.imageUrl,
    metadata: {
      badge: result.metadataPayload,
      metadataCid: result.metadataCid,
      imageCid: result.imageCid
    },
    nft_contract: result.collectionId,
    nft_token_id: result.itemId ?? null,
    mint_tx_hash: result.blockHash,
    metadata_cid: result.metadataCid,
    image_cid: result.imageCid,
    collection_id: result.collectionId,
    block_hash: result.blockHash,
    issued_at: new Date().toISOString()
  });
}
