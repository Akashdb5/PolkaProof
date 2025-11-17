"use client";

export type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
};

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
}

function utf8ToHex(value: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  let hex = "0x";
  bytes.forEach((byte) => {
    hex += byte.toString(16).padStart(2, "0");
  });
  return hex;
}

export async function signMessageWithEvm(address: string, message: string) {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("MetaMask not detected.");
  }
  const payload = utf8ToHex(message);
  const signature = (await provider.request({
    method: "personal_sign",
    params: [payload, address]
  })) as string;
  return signature;
}
