import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:";

function getKey(): Buffer {
  const raw = process.env.PLUGIN_SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PLUGIN_SETTINGS_ENCRYPTION_KEY is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "PLUGIN_SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }
  return buf;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string of the form: enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptSetting(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return (
    ENCRYPTED_PREFIX +
    iv.toString("hex") +
    ":" +
    authTag.toString("hex") +
    ":" +
    encrypted.toString("hex")
  );
}

/**
 * Decrypts a value that was encrypted by encryptSetting().
 * If the value does not start with the "enc:" prefix it is returned as-is
 * (allows gradual migration of settings that were saved before encryption was enabled).
 */
export function decryptSetting(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }
  const key = getKey();
  const parts = value.slice(ENCRYPTED_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted setting format.");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex").subarray(0, AUTH_TAG_LENGTH);
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

/**
 * Returns true if the value looks like an encrypted setting (has the enc: prefix).
 */
export function isEncryptedSetting(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}
