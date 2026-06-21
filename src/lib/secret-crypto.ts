import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const STRING_PREFIX = "enc:v1:";
const JSON_MARKER = "__mcpHubEncrypted";

type EncryptedJsonEnvelope = {
  [JSON_MARKER]: string;
};

function getEncryptionKey() {
  const source =
    process.env.MCP_HUB_ENCRYPTION_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (!source) {
    throw new Error(
      "MCP_HUB_ENCRYPTION_KEY or NEXTAUTH_SECRET is required to encrypt secrets.",
    );
  }

  return createHash("sha256").update(source).digest();
}

export function isEncryptedString(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(STRING_PREFIX);
}

export function encryptSecret(value: string) {
  if (!value || isEncryptedString(value)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${STRING_PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value || !isEncryptedString(value)) return value ?? "";

  const payload = Buffer.from(value.slice(STRING_PREFIX.length), "base64url");
  if (payload.length < 29) {
    throw new Error("Encrypted secret payload is invalid.");
  }

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptSecretJson(value: Record<string, string>) {
  return {
    [JSON_MARKER]: encryptSecret(JSON.stringify(value)),
  } satisfies EncryptedJsonEnvelope;
}

export function decryptSecretJson(value: unknown): Record<string, string> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON_MARKER in value &&
    typeof (value as EncryptedJsonEnvelope)[JSON_MARKER] === "string"
  ) {
    const decrypted = decryptSecret(
      (value as EncryptedJsonEnvelope)[JSON_MARKER],
    );
    const parsed = JSON.parse(decrypted) as unknown;
    return isStringRecord(parsed) ? parsed : {};
  }

  return isStringRecord(value) ? value : {};
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
      (entry) => typeof entry === "string",
    )
  );
}
