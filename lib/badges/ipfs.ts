const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

type PinataResponse = {
  IpfsHash: string;
};

function hasPinataCreds() {
  return Boolean(PINATA_JWT || (PINATA_API_KEY && PINATA_SECRET_API_KEY));
}

function buildPinataHeaders(extra?: Record<string, string>) {
  if (PINATA_JWT) {
    return {
      Authorization: `Bearer ${PINATA_JWT}`,
      ...(extra ?? {})
    };
  }

  if (PINATA_API_KEY && PINATA_SECRET_API_KEY) {
    return {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_API_KEY,
      ...(extra ?? {})
    };
  }

  throw new Error("Pinata credentials are not configured");
}

export async function uploadJsonToIpfs(
  payload: Record<string, unknown>,
  name = "badge-metadata.json"
) {
  if (!hasPinataCreds()) {
    console.warn("[badges] Pinata not configured, returning mock CID");
    return `mock-json-${Date.now()}`;
  }

  const body = JSON.stringify({
    pinataContent: payload,
    pinataMetadata: { name }
  });

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildPinataHeaders()
      },
      body
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Pinata JSON upload failed: ${response.status} ${detail}`.trim()
    );
  }

  const data = (await response.json()) as PinataResponse;
  return data.IpfsHash;
}

export async function uploadImageBufferToIpfs(
  buffer: Buffer,
  filename: string
) {
  if (!hasPinataCreds()) {
    console.warn("[badges] Pinata not configured, returning mock CID");
    return `mock-image-${Date.now()}`;
  }

  const formData = new FormData();
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const arrayBuffer = uint8.buffer.slice(
    uint8.byteOffset,
    uint8.byteOffset + uint8.byteLength
  );
  const blob = new Blob([arrayBuffer] as BlobPart[]);
  formData.append("file", blob, filename);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: filename,
      keyvalues: {
        type: "badge-image",
        timestamp: new Date().toISOString()
      }
    })
  );

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: buildPinataHeaders(),
      body: formData as unknown as BodyInit
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Pinata image upload failed: ${response.status} ${detail}`.trim()
    );
  }

  const data = (await response.json()) as PinataResponse;
  return data.IpfsHash;
}

export async function testPinataConnection() {
  if (!hasPinataCreds()) {
    return {
      success: false,
      message: "Pinata credentials missing"
    };
  }

  try {
    const response = await fetch(
      "https://api.pinata.cloud/data/testAuthentication",
      {
        headers: buildPinataHeaders()
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        success: false,
        message: `Pinata auth failed: ${detail || response.statusText}`
      };
    }

    return { success: true, message: "Pinata connection successful" };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Unknown Pinata error"
    };
  }
}
