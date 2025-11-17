export type WalletType = "polkadot" | "evm";

export type WalletIdentity = {
  address: string;
  type: WalletType;
};
