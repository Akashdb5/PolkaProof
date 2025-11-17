"use client";

import { create } from "zustand";
import type { WalletIdentity } from "@/lib/wallets/types";

type SelectedWalletState = {
  polkadotWallet: WalletIdentity | null;
  evmWallet: WalletIdentity | null;
  setPolkadotWallet(wallet: WalletIdentity | null): void;
  setEvmWallet(wallet: WalletIdentity | null): void;
};

export const useSelectedWallet = create<SelectedWalletState>((set) => ({
  polkadotWallet: null,
  evmWallet: null,
  setPolkadotWallet: (polkadotWallet) => set({ polkadotWallet }),
  setEvmWallet: (evmWallet) => set({ evmWallet })
}));
