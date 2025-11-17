"use client";

import { useSelectedWallet } from "@/lib/state/wallet-selection";
import { WalletGate } from "./WalletGate";

export function EventsWalletPanel() {
  const polkadotWallet = useSelectedWallet((state) => state.polkadotWallet);

  return (
    <div className="card space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Wallet status
        </p>
        <p className="text-sm text-slate-400">
          Select a wallet to display check-in status for each event below.
        </p>
      </div>
      <WalletGate />
      {polkadotWallet && (
        <p className="text-xs text-slate-500">
          Tracking status for{" "}
          <span className="font-mono text-slate-300">{polkadotWallet.address}</span>
        </p>
      )}
    </div>
  );
}
