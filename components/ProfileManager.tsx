"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { stringToHex } from "@polkadot/util";
import { apiClient } from "@/lib/api";
import {
  buildProfileUpdateMessage,
  normalizeProfileUpdates
} from "@/lib/profile";
import type { ProfileRecord } from "@/types/profile";
import { WalletGate } from "./WalletGate";
import { useSelectedWallet } from "@/lib/state/wallet-selection";

type ExtensionModule = typeof import("@polkadot/extension-dapp");
let extensionModulePromise: Promise<ExtensionModule> | null = null;

function loadExtensionModule(): Promise<ExtensionModule> {
  if (!extensionModulePromise) {
    extensionModulePromise = import("@polkadot/extension-dapp");
  }
  return extensionModulePromise;
}

async function getWalletSigner(address: string) {
  const { web3FromAddress } = await loadExtensionModule();
  return web3FromAddress(address);
}

type ProfileResponse = {
  profile: ProfileRecord | null;
  badges: Array<{
    id: string;
    event_id: string;
    image_url?: string | null;
    metadata?: Record<string, unknown> | null;
    issued_at?: string | null;
    nft_contract?: string | null;
    nft_token_id?: string | null;
  }>;
};

type FormState = {
  display_name: string;
  avatar_url: string;
  bio: string;
  website: string;
  cover_url: string;
};

const emptyFormState: FormState = {
  display_name: "",
  avatar_url: "",
  bio: "",
  website: "",
  cover_url: ""
};

function buildFormState(profile: ProfileRecord | null): FormState {
  return {
    display_name: profile?.display_name ?? "",
    avatar_url: profile?.avatar_url ?? "",
    bio: profile?.bio ?? "",
    website: profile?.website ?? "",
    cover_url: profile?.cover_url ?? ""
  };
}

export function ProfileManager() {
  const polkadotWallet = useSelectedWallet((state) => state.polkadotWallet);
  const [form, setForm] = useState<FormState>(emptyFormState);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [badges, setBadges] = useState<ProfileResponse["badges"]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "success">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const address = polkadotWallet?.address ?? "";
  const hasSelection = Boolean(polkadotWallet);

  const refreshProfile = useCallback(
    async (targetAddress: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<ProfileResponse>(
          `/api/profile/${targetAddress}`
        );
        setProfile(data.profile ?? null);
        setBadges(data.badges ?? []);
        setForm(buildFormState(data.profile ?? null));
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!polkadotWallet) {
      setProfile(null);
      setBadges([]);
      setForm(emptyFormState);
      return;
    }
    refreshProfile(polkadotWallet.address);
  }, [polkadotWallet, refreshProfile]);

  const updates = useMemo(
    () =>
      normalizeProfileUpdates({
        display_name: form.display_name,
        avatar_url: form.avatar_url,
        bio: form.bio,
        website: form.website,
        cover_url: form.cover_url
      }),
    [form]
  );

  const handleSave = async () => {
    if (!polkadotWallet) return;

    try {
      setStatus("saving");
      setError(null);
      const timestamp = Math.floor(Date.now() / 1000);
      const message = buildProfileUpdateMessage({
        address,
        updates,
        timestamp
      });

      const injector = await getWalletSigner(address);
      const signer = injector?.signer;
      if (!signer || typeof signer.signRaw !== "function") {
        throw new Error("Wallet signer unavailable.");
      }
      const signed = await signer.signRaw({
        address,
        data: stringToHex(message),
        type: "bytes"
      });

      await apiClient.patch(`/api/profile/${address}`, {
        signature: signed.signature,
        message,
        timestamp,
        updates
      });

      await refreshProfile(address);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setError(err?.message ?? "Failed to update profile");
    }
  };

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Wallet
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Manage your PolkaProof profile
          </h2>
          <p className="text-sm text-slate-400">
            Select a wallet to load editable profile fields. All changes require
            a signed message.
          </p>
        </div>
        <WalletGate />
        {profile?.evm_address && (
          <p className="text-xs text-slate-500">
            Linked MetaMask address: <span className="font-mono">{profile.evm_address}</span>
          </p>
        )}
        {address && (
          <p className="text-xs text-slate-500">
            Editing profile for{" "}
            <span className="font-mono text-slate-300">{address}</span>
          </p>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Profile
            </p>
            <h3 className="text-xl font-semibold text-white">
              Public details
            </h3>
          </div>
          {loading && <span className="text-xs text-slate-400">Loading...</span>}
        </div>
        {!hasSelection && (
          <p className="text-sm text-slate-400">
            Connect a wallet above to view and edit your profile.
          </p>
        )}
        {hasSelection && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-xs uppercase tracking-widest text-slate-500">
                Display name
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={form.display_name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    display_name: event.target.value
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-xs uppercase tracking-widest text-slate-500">
                Avatar URL
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={form.avatar_url}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    avatar_url: event.target.value
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-xs uppercase tracking-widest text-slate-500">
                Bio
              </span>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                rows={4}
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-xs uppercase tracking-widest text-slate-500">
                Website
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={form.website}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    website: event.target.value
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-xs uppercase tracking-widest text-slate-500">
                Cover image URL
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                value={form.cover_url}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    cover_url: event.target.value
                  }))
                }
              />
            </label>
          </div>
        )}
        {hasSelection && (
          <button
            className="rounded-full bg-polka-pink px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={status === "saving"}
            onClick={handleSave}
          >
            {status === "saving" ? "Saving..." : "Save profile"}
          </button>
        )}
        {status === "success" && (
          <p className="text-sm text-emerald-400">
            Profile updated successfully.
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>

      {hasSelection && (
        <section className="card space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Badges
            </p>
            <h3 className="text-xl font-semibold text-white">
              Issued collectibles
            </h3>
          </div>
          {badges.length === 0 ? (
            <p className="text-sm text-slate-400">
              No badges yet. Check in at events to earn collectible proofs.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {badges.map((badge) => (
                <li
                  key={badge.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    Event: {badge.event_id}
                  </p>
                  {badge.image_url && (
                    <img
                      src={badge.image_url}
                      alt="Badge art"
                      className="mt-3 h-32 w-full rounded-xl object-cover"
                    />
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Issued at:{" "}
                    {badge.issued_at
                      ? new Date(badge.issued_at).toLocaleString()
                      : "pending"}
                  </p>
                  {badge.nft_contract && (
                    <p className="text-xs text-slate-400">
                      NFT: {badge.nft_contract}#{badge.nft_token_id ?? "?"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
