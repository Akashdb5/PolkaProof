import { ApiPromise, WsProvider } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { ISubmittableResult } from "@polkadot/types/types";
import { badgeKeyring } from "./keyring";
import { getBadgeConfig } from "./config";
import {
  uploadImageBufferToIpfs,
  uploadJsonToIpfs,
  testPinataConnection
} from "./ipfs";
import { buildDefaultBadgeSvg, delay, svgToBuffer } from "./svg";

const DEFAULT_IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

function normalizeGateway(value?: string | null) {
  if (!value) return null;
  return value.endsWith("/") ? value : `${value}/`;
}

const serverIpfsGateway =
  normalizeGateway(process.env.IPFS_GATEWAY) ??
  normalizeGateway(process.env.NEXT_PUBLIC_IPFS_GATEWAY) ??
  DEFAULT_IPFS_GATEWAY;

export type MintBadgeInput = {
  participantAddress: string;
  participantName: string;
  eventName: string;
  eventId?: string | null;
  imageCid?: string;
  imageBase64?: string;
  metadata?: Record<string, unknown>;
};

export type MintBadgeResult = {
  participantAddress: string;
  participantName: string;
  eventName: string;
  eventId?: string | null;
  collectionId: string;
  itemId?: string;
  blockHash: string;
  metadataCid: string;
  imageCid: string;
  metadataUrl: string;
  imageUrl: string;
  metadataPayload: Record<string, unknown>;
};

type SignAndSendResult = {
  blockHash: string;
  events: ISubmittableResult["events"];
};

class BadgeService {
  private api: ApiPromise | null = null;
  private isConnecting = false;
  private collectionId: string | null =
    getBadgeConfig().collectionId ?? null;

  private async ensureApi(): Promise<ApiPromise> {
    if (this.api) {
      return this.api;
    }
    if (this.isConnecting) {
      await delay(250);
      return this.ensureApi();
    }

    const { rpcEndpoint } = getBadgeConfig();
    if (!rpcEndpoint) {
      throw new Error("BADGE_RPC_ENDPOINT is not configured");
    }

    this.isConnecting = true;
    try {
      const provider = new WsProvider(rpcEndpoint);
      this.api = await ApiPromise.create({ provider });
      await this.api.isReady;
      return this.api;
    } finally {
      this.isConnecting = false;
    }
  }

  async ensureReady(): Promise<ApiPromise> {
    return this.ensureApi();
  }

  async disconnect() {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
  }

  private async signAndSend(
    tx: SubmittableExtrinsic<"promise">,
    mnemonic?: string
  ): Promise<SignAndSendResult> {
    const api = await this.ensureApi();
    const admin = badgeKeyring.ensureAdmin(mnemonic);

    return new Promise((resolve, reject) => {
      tx.signAndSend(admin, (result) => {
        if (result.dispatchError) {
          if (result.dispatchError.isModule) {
            const decoded = api.registry.findMetaError(
              result.dispatchError.asModule
            );
            reject(
              new Error(
                `Extrinsic failed: ${decoded.section}.${decoded.name}`
              )
            );
          } else {
            reject(new Error(result.dispatchError.toString()));
          }
          return;
        }

        if (result.status.isInBlock) {
          resolve({
            blockHash: result.status.asInBlock.toHex(),
            events: result.events
          });
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async createCollection() {
    const api = await this.ensureApi();
    const config = getBadgeConfig();
    const admin = badgeKeyring.ensureAdmin(config.adminMnemonic);

    const tx = api.tx.nfts.create(admin.address, {
      settings: {
        transferable: false,
        unlockedAttributes: true,
        unlockedMetadata: true,
        unlockedMaxSupply: false
      }
    });

    const { blockHash, events } = await this.signAndSend(
      tx,
      config.adminMnemonic
    );

    const createdEvent = events.find(
      ({ event }) =>
        event.section === "nfts" && event.method === "Created"
    );
    if (!createdEvent) {
      throw new Error("CollectionCreated event not found");
    }

    const collectionId = createdEvent.event.data[0].toString();

    if (config.collection.description || config.collection.image) {
      const metadataPayload = {
        name: config.collection.name,
        description: config.collection.description,
        image: config.collection.image,
        created: new Date().toISOString()
      };
      const metadataCid = await uploadJsonToIpfs(
        metadataPayload,
        "collection-metadata.json"
      );
      const metadataTx = api.tx.nfts.setCollectionMetadata(
        collectionId,
        metadataCid
      );
      await this.signAndSend(metadataTx, config.adminMnemonic);
    }

    this.collectionId = collectionId;

    return { collectionId, blockHash };
  }

  private ensureCollectionId() {
    if (!this.collectionId) {
      throw new Error(
        "Badge collection not created. Set BADGE_COLLECTION_ID or call the collection endpoint."
      );
    }
    return this.collectionId;
  }

  private async prepareImage(
    participantName: string,
    eventName: string,
    imageCid?: string,
    imageBase64?: string
  ) {
    if (imageCid) return imageCid;

    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, "base64");
      return uploadImageBufferToIpfs(
        buffer,
        `${participantName}-${Date.now()}.png`
      );
    }

    const svg = buildDefaultBadgeSvg(participantName, eventName);
    return uploadImageBufferToIpfs(
      svgToBuffer(svg),
      `${participantName}-${Date.now()}.svg`
    );
  }

  async mintBadge(input: MintBadgeInput): Promise<MintBadgeResult> {
    const api = await this.ensureApi();
    const config = getBadgeConfig();
    const collectionId = this.ensureCollectionId();
    const admin = badgeKeyring.ensureAdmin(config.adminMnemonic);

    const imageCid = await this.prepareImage(
      input.participantName,
      input.eventName,
      input.imageCid,
      input.imageBase64
    );

    const metadataPayload = {
      name: `${input.eventName} - ${input.participantName}`,
      description: `Participation badge for ${input.eventName}`,
      image: `ipfs://${imageCid}`,
      attributes: [
        { trait_type: "event", value: input.eventName },
        input.eventId
          ? { trait_type: "event_id", value: input.eventId }
          : undefined,
        { trait_type: "participant", value: input.participantName }
      ].filter(Boolean),
      ...input.metadata
    };

    const metadataCid = await uploadJsonToIpfs(
      metadataPayload,
      `${input.participantName}-metadata.json`
    );

    const mintTx = api.tx.nfts.mint(collectionId, input.participantAddress, {
      attributes: [],
      metadata: metadataCid
    });

    const { blockHash, events } = await this.signAndSend(
      mintTx,
      config.adminMnemonic
    );

    const issuedEvent = events.find(
      ({ event }) =>
        event.section === "nfts" && event.method === "Issued"
    );
    const itemId = issuedEvent?.event.data?.[2]?.toString();

    return {
      participantAddress: input.participantAddress,
      participantName: input.participantName,
      eventName: input.eventName,
      eventId: input.eventId,
      collectionId,
      itemId,
      blockHash,
      metadataCid,
      imageCid,
      metadataUrl: `${serverIpfsGateway}${metadataCid}`,
      imageUrl: `${serverIpfsGateway}${imageCid}`,
      metadataPayload
    };
  }

  async mintBatch(inputs: MintBadgeInput[]) {
    const results: Array<
      | ({ success: true } & MintBadgeResult)
      | { success: false; error: string; participantAddress: string }
    > = [];
    for (const input of inputs) {
      try {
        await delay(500);
        const result = await this.mintBadge(input);
        results.push({ success: true, ...result });
      } catch (error: any) {
        results.push({
          success: false,
          participantAddress: input.participantAddress,
          error: error?.message ?? "Mint failed"
        });
      }
    }
    return results;
  }

  async getHealth() {
    const config = getBadgeConfig();
    const rpc = config.rpcEndpoint ?? "unknown";
    const admin = config.adminMnemonic
      ? badgeKeyring.ensureAdmin(config.adminMnemonic)
      : null;

    const pinata = await testPinataConnection();

    return {
      rpcEndpoint: rpc,
      collectionId: this.collectionId,
      adminAddress: admin?.address ?? null,
      pinata,
      connected: Boolean(this.api)
    };
  }

  getCollectionInfo() {
    const config = getBadgeConfig();
    return {
      collectionId: this.collectionId,
      ...config.collection
    };
  }
}

export const badgeService = new BadgeService();
