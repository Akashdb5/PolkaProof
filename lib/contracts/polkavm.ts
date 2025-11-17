import fs from "node:fs";
import path from "node:path";

type ContractMetadata = Record<string, unknown> | null;

type PolkaVmContractConfig = {
  address: string | null;
  network: string | null;
  rpcUrl: string | null;
  explorerBaseUrl: string | null;
  metadataUrl: string | null;
  metadata: ContractMetadata;
  metadataPath: string | null;
  ipfsGateway: string | null;
};

const DEFAULT_METADATA_RELATIVE = "public/contracts/healthchain_polkavm.json";

let cachedMetadata: {
  path: string;
  mtimeMs: number;
  payload: ContractMetadata;
} | null = null;

function resolveMetadataPath(): string {
  const rawPath = process.env.CONTRACT_METADATA_PATH ?? DEFAULT_METADATA_RELATIVE;
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  const normalized = rawPath.replace(/^\/+/, "");
  return path.join(process.cwd(), normalized);
}

function loadContractMetadata(): ContractMetadata {
  const metadataPath = resolveMetadataPath();
  try {
    const stat = fs.statSync(metadataPath);
    if (
      !cachedMetadata ||
      cachedMetadata.path !== metadataPath ||
      cachedMetadata.mtimeMs !== stat.mtimeMs
    ) {
      const file = fs.readFileSync(metadataPath, "utf-8");
      cachedMetadata = {
        path: metadataPath,
        mtimeMs: stat.mtimeMs,
        payload: JSON.parse(file)
      };
    }
    return cachedMetadata.payload;
  } catch (error) {
    console.warn(
      `[contracts] Unable to load metadata at ${metadataPath}:`,
      (error as Error)?.message ?? error
    );
    return null;
  }
}

function resolveRpcUrl() {
  return (
    process.env.POLKADOT_WS_URL ||
    process.env.NEXT_PUBLIC_POLKADOT_WS_URL ||
    process.env.BADGE_RPC_ENDPOINT ||
    null
  );
}

function normalizeGateway(value?: string | null) {
  if (!value) return null;
  return value.endsWith("/") ? value : `${value}/`;
}

export function getPolkaVmContractConfig(): PolkaVmContractConfig {
  return {
    address: process.env.CONTRACT_ADDRESS ?? null,
    network: process.env.NEXT_PUBLIC_POLKADOT_NETWORK ?? null,
    rpcUrl: resolveRpcUrl(),
    explorerBaseUrl: process.env.NEXT_PUBLIC_EXPLORER_BASE_URL ?? null,
    metadataUrl:
      process.env.NEXT_PUBLIC_CONTRACT_METADATA_URL ??
      "/contracts/healthchain_polkavm.json",
    metadata: loadContractMetadata(),
    metadataPath: resolveMetadataPath(),
    ipfsGateway:
      normalizeGateway(process.env.NEXT_PUBLIC_IPFS_GATEWAY) ??
      normalizeGateway(process.env.IPFS_GATEWAY)
  };
}
