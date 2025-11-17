import "dotenv/config";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";

function assertEnv(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

async function main() {
  const rpcEndpoint =
    process.env.BADGE_RPC_ENDPOINT || "wss://westend-rpc.polkadot.io";
  const mnemonic = assertEnv(
    process.env.BADGE_ADMIN_MNEMONIC,
    "BADGE_ADMIN_MNEMONIC is required"
  );

  const provider = new WsProvider(rpcEndpoint);
  const api = await ApiPromise.create({ provider });
  const keyring = new Keyring({ type: "sr25519" });
  const signer = keyring.addFromMnemonic(mnemonic);

  console.log(`Creating collection on ${rpcEndpoint}...`);

  const tx = api.tx.nfts.create(signer.address, {
    settings: {
      transferable: false,
      unlockedAttributes: true,
      unlockedMetadata: true,
      unlockedMaxSupply: false
    }
  });

  const unsub = await tx.signAndSend(signer, ({ status, events, dispatchError }) => {
    if (dispatchError) {
      if (dispatchError.isModule) {
        const decoded = api.registry.findMetaError(dispatchError.asModule);
        console.error(`Dispatch error: ${decoded.section}.${decoded.name}`);
      } else {
        console.error("Dispatch error:", dispatchError.toString());
      }
    }

    if (status.isInBlock) {
      console.log("Included in block:", status.asInBlock.toHex());
      events.forEach(({ event }) => {
        if (event.section === "nfts" && event.method === "Created") {
          const id = event.data[0].toString();
          console.log(`Collection created. Set BADGE_COLLECTION_ID=${id}`);
        }
      });
      unsub();
      process.exit(0);
    }
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
