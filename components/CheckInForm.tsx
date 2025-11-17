"use client";

import { web3FromAddress } from "@polkadot/extension-dapp";
import { stringToHex } from "@polkadot/util";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { buildMessage } from "@/lib/messages";
import { WalletGate } from "./WalletGate";
import { AttendanceStatusResponse } from "@/types/attendance";
import { useSelectedWallet } from "@/lib/state/wallet-selection";

type CheckInFormProps = {
  eventId: string;
};

export function CheckInForm({ eventId }: CheckInFormProps) {
  const polkadotWallet = useSelectedWallet((state) => state.polkadotWallet);
  const evmWallet = useSelectedWallet((state) => state.evmWallet);
  const [status, setStatus] = useState<"idle" | "signing" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] =
    useState<AttendanceStatusResponse | null>(null);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const address = polkadotWallet?.address ?? "";

  useEffect(() => {
    if (!address) {
      setRegistration(null);
      setLookupError(null);
      setIsCheckingRegistration(false);
      setStatus("idle");
      setError(null);
      setMessage(null);
      return;
    }

    let cancelled = false;
    setIsCheckingRegistration(true);
    setLookupError(null);

    apiClient
      .get<AttendanceStatusResponse>(
        `/api/event/${eventId}/attendance-status?address=${encodeURIComponent(
          address
        )}`
      )
      .then((res) => {
        if (!cancelled) {
          setRegistration(res);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setRegistration(null);
          setLookupError("Unable to check your registration status.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingRegistration(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, eventId]);

  const handleCheckIn = async () => {
    if (!polkadotWallet) return;
    setStatus("signing");
    setError(null);
    try {
      const pre = await apiClient.get<{ eventId: string; nonce: string; timestamp: number }>(
        `/api/event/${eventId}/pre-sign`
      );
      const resolvedEventId = pre.eventId ?? eventId;
      const msg = buildMessage({
        eventId: resolvedEventId,
        address,
        nonce: pre.nonce,
        timestamp: pre.timestamp
      });
      const injector = await web3FromAddress(address);
      const signer = injector?.signer;
      if (!signer || typeof signer.signRaw !== "function") {
        throw new Error("Wallet signer unavailable.");
      }
      const signed = await signer.signRaw({
        address,
        data: stringToHex(msg),
        type: "bytes"
      });
      await apiClient.post("/api/attendance", {
        eventId: resolvedEventId,
        address,
        signature: signed.signature,
        message: msg,
        evmAddress: evmWallet?.address ?? null
      });

      setMessage("Attendance recorded and verified.");
      setStatus("success");
      setRegistration({
        registered: true,
        status: "confirmed",
        verifiedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Check-in failed");
      setStatus("error");
    }
  };

  const defaultStatusCopy = {
    idle: "Connect a wallet to start the check-in.",
    signing: "Awaiting wallet signature...",
    success: "Attendance recorded and verified.",
    error: error ?? "An error occurred."
  } as const;

  const alreadyRegistered = registration?.registered ?? false;
  const formattedVerifiedAt = registration?.verifiedAt
    ? new Date(registration.verifiedAt).toLocaleString()
    : null;
  const statusMessage = isCheckingRegistration
    ? "Checking your registration status..."
    : alreadyRegistered
    ? `This wallet already checked in${
        formattedVerifiedAt ? ` on ${formattedVerifiedAt}` : ""
      }.`
    : defaultStatusCopy[status];
  const isSubmitDisabled =
    !polkadotWallet || status === "signing" || alreadyRegistered || isCheckingRegistration;
  const submitLabel = alreadyRegistered
    ? "Already checked in"
    : status === "signing"
    ? "Signing..."
    : isCheckingRegistration
    ? "Checking..."
    : "Submit signature";

  return (
    <div className="card space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-slate-500">Check-in</p>
        <h2 className="text-2xl font-semibold text-white">Sign and submit</h2>
        <p className="text-sm text-slate-400">{statusMessage}</p>
      </div>
      <WalletGate />
      <p className="text-xs text-slate-500">
        Connect a Polkadot wallet to sign the attendance proof. Optionally connect MetaMask so we can drop
        rewards to your EVM address later.
      </p>
      <button
        className="w-full rounded-full bg-polka-pink px-6 py-3 font-semibold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isSubmitDisabled}
        onClick={handleCheckIn}
      >
        {submitLabel}
      </button>
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && status === "error" && <p className="text-sm text-red-400">{error}</p>}
      {lookupError && <p className="text-sm text-amber-300">{lookupError}</p>}
      {address && (
        <p className="text-xs text-slate-500">
          Polkadot wallet: <span className="font-mono">{address}</span>
        </p>
      )}
      {evmWallet?.address && (
        <p className="text-xs text-slate-500">
          MetaMask wallet: <span className="font-mono">{evmWallet.address}</span>
        </p>
      )}
    </div>
  );
}
