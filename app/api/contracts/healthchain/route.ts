import { NextResponse } from "next/server";
import { getPolkaVmContractConfig } from "@/lib/contracts/polkavm";

export async function GET() {
  const config = getPolkaVmContractConfig();
  const missing = {
    address: !config.address,
    metadata: !config.metadata
  } as const;
  const ready = !missing.address && !missing.metadata;

  return NextResponse.json({
    success: ready,
    config: {
      address: config.address,
      network: config.network,
      rpcUrl: config.rpcUrl,
      explorerBaseUrl: config.explorerBaseUrl,
      metadataUrl: config.metadataUrl,
      metadataPath: config.metadataPath,
      ipfsGateway: config.ipfsGateway
    },
    metadata: config.metadata,
    missing
  });
}
