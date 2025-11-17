const TEMPLATE_HEADER = "PolkaProof Attendance Check-In";

type MessageArgs = {
  eventId: string;
  address: string;
  nonce: string;
  timestamp: number;
};

export function buildMessage({ eventId, address, nonce, timestamp }: MessageArgs) {
  return [
    TEMPLATE_HEADER,
    `Event ID: ${eventId}`,
    `Timestamp: ${timestamp}`,
    `Nonce: ${nonce}`,
    `Wallet: ${address}`
  ].join("\n");
}

export function validateMessageShape(message: string, expected: MessageArgs) {
  return message === buildMessage(expected);
}

export function extractNonce(message: string) {
  const line = message.split("\n").find((l) => l.startsWith("Nonce:"));
  return line?.split(":")[1]?.trim();
}

export function extractTimestamp(message: string) {
  const line = message.split("\n").find((l) => l.startsWith("Timestamp:"));
  const value = line?.split(":")[1]?.trim();
  return value ? Number(value) : undefined;
}
