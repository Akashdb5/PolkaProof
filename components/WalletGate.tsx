"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEthereumProvider,
  type EthereumProvider
} from "@/lib/wallets/evm-client";
import { useSelectedWallet } from "@/lib/state/wallet-selection";

type ExtensionAccount = {
  address: string;
  meta?: {
    name?: string;
    [key: string]: unknown;
  };
};

type ExtensionModule = typeof import("@polkadot/extension-dapp");
let extensionModulePromise: Promise<ExtensionModule> | null = null;

function loadExtensionModule(): Promise<ExtensionModule> {
  if (!extensionModulePromise) {
    extensionModulePromise = import("@polkadot/extension-dapp");
  }
  return extensionModulePromise;
}

export function WalletGate() {
  const polkadotWallet = useSelectedWallet((state) => state.polkadotWallet);
  const evmWallet = useSelectedWallet((state) => state.evmWallet);
  const setPolkadotWallet = useSelectedWallet(
    (state) => state.setPolkadotWallet
  );
  const setEvmWallet = useSelectedWallet((state) => state.setEvmWallet);
  const [accounts, setAccounts] = useState<ExtensionAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [evmError, setEvmError] = useState<string | null>(null);
  const [isRequestingEvm, setIsRequestingEvm] = useState(false);

  const ethereum = getEthereumProvider();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { web3Enable, web3Accounts } = await loadExtensionModule();
        await web3Enable("PolkaProof");
        const available = await web3Accounts();
        if (!isMounted) return;
        setAccounts(available);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Unable to load Polkadot wallet extension.");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasAutoSelected && !polkadotWallet && accounts.length > 0) {
      setPolkadotWallet({ address: accounts[0].address, type: "polkadot" });
      setHasAutoSelected(true);
    }
  }, [accounts, hasAutoSelected, polkadotWallet, setPolkadotWallet]);

  useEffect(() => {
    if (!ethereum) return;
    const handler = (accountsList: unknown) => {
      const list = Array.isArray(accountsList) ? accountsList : [];
      const nextAddress = list[0] ?? null;
      setEvmAddress(nextAddress);
      if (!nextAddress) {
        setEvmWallet(null);
      } else {
        setEvmWallet({ address: nextAddress, type: "evm" });
        setEvmAddress(nextAddress);
      }
    };

    ethereum.on?.("accountsChanged", handler);
    return () => {
      ethereum.removeListener?.("accountsChanged", handler);
    };
  }, [ethereum, setEvmWallet]);

  const handleConnectEvm = useCallback(async () => {
    if (!ethereum) {
      setEvmError("MetaMask not detected in this browser.");
      return;
    }
    setIsRequestingEvm(true);
    setEvmError(null);
    try {
      const accountsList = (await ethereum.request({
        method: "eth_requestAccounts"
      })) as string[];
      const nextAddress = accountsList?.[0] ?? null;
      if (nextAddress) {
        setEvmAddress(nextAddress);
        setEvmWallet({ address: nextAddress, type: "evm" });
      }
    } catch (err: any) {
      console.error(err);
      setEvmError(err?.message ?? "Unable to connect MetaMask.");
    } finally {
      setIsRequestingEvm(false);
    }
  }, [ethereum, setEvmWallet]);

  const polkadotSection = useMemo(() => {
    if (error) {
      return <p className="text-sm text-red-400">{error}</p>;
    }

    if (!accounts.length) {
      return (
        <p className="text-sm text-slate-400">
          Connect a Polkadot wallet extension (Talisman, Subwallet, or Polkadot.js) to enable
          SR25519/Secp256k1 signing.
        </p>
      );
    }

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map((acct) => {
          const isActive = polkadotWallet?.address === acct.address;
          return (
            <button
              key={acct.address}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                isActive
                  ? "border-polka-pink bg-polka-pink/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-polka-pink/50"
              }`}
              onClick={() =>
                setPolkadotWallet({ address: acct.address, type: "polkadot" })
              }
            >
              <p className="font-semibold">{acct.meta?.name ?? "Polkadot Wallet"}</p>
              <p className="font-mono text-xs text-slate-400">{acct.address}</p>
            </button>
          );
        })}
      </div>
    );
  }, [accounts, error, polkadotWallet, setPolkadotWallet]);

  const evmSection = useMemo(() => {
    if (!ethereum) {
      return (
        <p className="text-sm text-slate-400">
          Install MetaMask or another EVM-compatible wallet extension to connect via ECDSA.
        </p>
      );
    }

    const connectedEvmAddress = evmWallet?.address ?? evmAddress;

    if (connectedEvmAddress) {
      return (
        <button
          className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
            evmWallet
              ? "border-polka-pink bg-polka-pink/10 text-white"
              : "border-white/10 bg-white/5 text-slate-200 hover:border-polka-pink/50"
          }`}
          onClick={() =>
            setEvmWallet({ address: connectedEvmAddress, type: "evm" })
          }
        >
          <p className="font-semibold">MetaMask</p>
          <p className="font-mono text-xs text-slate-400">
            {connectedEvmAddress}
          </p>
        </button>
      );
    }

    return (
      <button
        type="button"
        className="w-full rounded-full border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white hover:border-polka-pink disabled:opacity-50"
        onClick={handleConnectEvm}
        disabled={isRequestingEvm}
      >
        {isRequestingEvm ? "Connecting..." : "Connect MetaMask"}
      </button>
    );
  }, [ethereum, evmAddress, evmWallet, handleConnectEvm, isRequestingEvm, setEvmWallet]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-slate-500">Polkadot Wallets</p>
        {polkadotSection}
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-slate-500">MetaMask / EVM</p>
        {evmSection}
        {evmError && <p className="text-xs text-red-400">{evmError}</p>}
      </div>
      <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-400">
        {polkadotWallet && (
          <button
            type="button"
            onClick={() => setPolkadotWallet(null)}
            className="hover:text-white"
          >
            Disconnect Polkadot
          </button>
        )}
        {evmWallet && (
          <button
            type="button"
            onClick={() => setEvmWallet(null)}
            className="hover:text-white"
          >
            Disconnect MetaMask
          </button>
        )}
      </div>
    </div>
  );
}
