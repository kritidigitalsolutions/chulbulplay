const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from environment encryption key or fallback
 */
function getEncryptionKey() {
  const secret =
    process.env.GOOGLE_ADMOB_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "chulbulplay-admob-default-secure-fallback-key";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

/**
 * Encrypts a plaintext string to an encrypted hex payload
 */
function encrypt(text) {
  if (!text || typeof text !== "string") return "";
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Format: iv:encrypted:tag
    return `${iv.toString("hex")}:${encrypted}:${tag.toString("hex")}`;
  } catch (error) {
    console.error("AdMob Encryption Error:", error);
    throw new Error("Failed to encrypt sensitive AdMob credential");
  }
}

/**
 * Decrypts an encrypted hex payload to plaintext
 */
function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== "string") return "";
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      // Return as is if not in encrypted format (legacy/unencrypted fallback)
      return ciphertext;
    }

    const [ivHex, encryptedHex, tagHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("AdMob Decryption Error:", error.message);
    return "";
  }
}

module.exports = {
  encrypt,
  decrypt
};
