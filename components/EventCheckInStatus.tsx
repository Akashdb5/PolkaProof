"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useSelectedWallet } from "@/lib/state/wallet-selection";
import { AttendanceStatusResponse } from "@/types/attendance";

type Props = {
  eventId: string;
};

type StatusState = "idle" | "loading" | "registered" | "not-registered" | "error";

export function EventCheckInStatus({ eventId }: Props) {
  const polkadotWallet = useSelectedWallet((state) => state.polkadotWallet);
  const selectedAddress = polkadotWallet?.address ?? "";
  const [status, setStatus] = useState<StatusState>("idle");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAddress) {
      setStatus("idle");
      setVerifiedAt(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setVerifiedAt(null);
    setError(null);

    apiClient
      .get<AttendanceStatusResponse>(
        `/api/event/${eventId}/attendance-status?address=${encodeURIComponent(
          selectedAddress
        )}`
      )
      .then((res) => {
        if (cancelled) return;
        if (res.registered) {
          setStatus("registered");
          setVerifiedAt(res.verifiedAt ?? null);
        } else {
          setStatus("not-registered");
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setStatus("error");
          setError(err?.message ?? "Unable to load status.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, selectedAddress]);

  let message = "Select a wallet above to see your status.";
  let colorClass = "text-slate-400";

  if (status === "loading") {
    message = "Checking status...";
  } else if (status === "registered") {
    const formatted = verifiedAt
      ? new Date(verifiedAt).toLocaleString()
      : null;
    const suffix = formatted ? ` (${formatted})` : "";
    message = `Already checked in${suffix}.`;
    colorClass = "text-emerald-400";
  } else if (status === "not-registered") {
    message = "Not checked in yet.";
    colorClass = "text-amber-300";
  } else if (status === "error") {
    message = error ?? "Unable to load status.";
    colorClass = "text-red-400";
  }

  return <p className={`text-xs ${colorClass}`}>{message}</p>;
}
