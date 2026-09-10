const crypto = require("crypto");

const SABPAISA_CONFIG = {
  get apiKey() { return process.env.SABPAISA_API_KEY; },
  get secretKey() { return process.env.SABPAISA_SECRET_KEY; },
  get merchantId() { return process.env.SABPAISA_MERCHANT_ID; },
  get mode() { return process.env.SABPAISA_MODE || "test"; },
  get baseUrl() {
    return process.env.SABPAISA_BASE_URL || (this.mode === "live"
      ? "https://merchant-api.sabpaisa.in"
      : "https://staging-sb-merchant-api.sabpaisa.in");
  },
  get returnUrl() { return process.env.SABPAISA_RETURN_URL; },
  get webhookSecret() { return process.env.SABPAISA_WEBHOOK_SECRET || this.secretKey; },
};

function createChecksum({ merchantId, merchantTxnId, amount, currency, timestamp }) {
  const value = `${merchantId}|${merchantTxnId}|${amount}|${currency}|${timestamp}`;
  return crypto.createHmac("sha256", SABPAISA_CONFIG.secretKey).update(value).digest("hex");
}

function timingSafeEqual(expected, actual) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function verifyReturnSignature(params) {
  const { signature, ...unsigned } = params;
  const value = Object.keys(unsigned)
    .filter((key) => unsigned[key] !== undefined && unsigned[key] !== null)
    .sort()
    .map((key) => `${key}=${unsigned[key]}`)
    .join("|");
  const expected = crypto.createHmac("sha256", SABPAISA_CONFIG.secretKey).update(value).digest("hex");
  return timingSafeEqual(expected, String(signature || "").toLowerCase());
}

function verifyWebhookSignature(rawBody, header) {
  const [timestamp, received] = String(header || "").split(".", 2);
  if (!timestamp || !received || !SABPAISA_CONFIG.webhookSecret) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", SABPAISA_CONFIG.webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("base64");
  return timingSafeEqual(expected, received);
}

if (SABPAISA_CONFIG.apiKey && SABPAISA_CONFIG.secretKey && SABPAISA_CONFIG.merchantId) {
  console.log(`✅ SabPaisa Payment Gateway initialized [Mode: ${SABPAISA_CONFIG.mode}]`);
}

module.exports = { SABPAISA_CONFIG, createChecksum, verifyReturnSignature, verifyWebhookSignature };
