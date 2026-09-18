const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const AdmobSettings = require("../models/admobSettings.model");
const { encrypt, decrypt } = require("../utils/admobCrypto");

const ADMOB_SCOPES = [
  "https://www.googleapis.com/auth/admob.readonly",
  "https://www.googleapis.com/auth/admob.report",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Builds an initialized OAuth2Client from settings or environment variables
 */
async function getOAuthClient() {
  const settings = await AdmobSettings.getSettings();

  const clientId =
    settings.oauth?.clientId ||
    process.env.GOOGLE_ADMOB_CLIENT_ID ||
    "";

  let clientSecret = "";
  if (settings.oauth?.clientSecretEncrypted) {
    clientSecret = decrypt(settings.oauth.clientSecretEncrypted);
  }
  if (!clientSecret && process.env.GOOGLE_ADMOB_CLIENT_SECRET) {
    clientSecret = process.env.GOOGLE_ADMOB_CLIENT_SECRET;
  }

  const redirectUri =
    process.env.GOOGLE_ADMOB_REDIRECT_URI ||
    "http://localhost:5000/api/admin/admob/oauth/callback";

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth 2.0 authorization URL
 */
async function generateAuthUrl(state = "") {
  const client = await getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ADMOB_SCOPES,
    state: state || "admob_auth",
  });
}

/**
 * Exchanges authorization code for access and refresh tokens
 */
async function exchangeCodeForTokens(code) {
  const client = await getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch Google user email
  let googleEmail = "";
  try {
    const userInfoRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    if (userInfoRes.data?.email) {
      googleEmail = userInfoRes.data.email;
    }
  } catch (err) {
    console.warn("Could not fetch Google userinfo:", err.message);
  }

  const settings = await AdmobSettings.getSettings();

  if (tokens.refresh_token) {
    settings.oauth.refreshTokenEncrypted = encrypt(tokens.refresh_token);
  }

  if (googleEmail) {
    settings.googleAccountEmail = googleEmail;
  }

  settings.connectionStatus = "connected";
  settings.lastSyncError = null;
  await settings.save();

  return { tokens, googleEmail };
}

/**
 * Obtains a fresh access token using the stored encrypted refresh token
 */
async function getFreshAccessToken() {
  const settings = await AdmobSettings.getSettings();
  let refreshToken = "";

  if (settings.oauth?.refreshTokenEncrypted) {
    refreshToken = decrypt(settings.oauth.refreshTokenEncrypted);
  }

  if (!refreshToken && process.env.GOOGLE_ADMOB_REFRESH_TOKEN) {
    refreshToken = process.env.GOOGLE_ADMOB_REFRESH_TOKEN.trim();
  }

  if (!refreshToken) {
    throw new Error("No Google AdMob refresh token found. Please connect Google account or set in .env.");
  }

  const client = await getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();
  return credentials.access_token;
}

module.exports = {
  getOAuthClient,
  generateAuthUrl,
  exchangeCodeForTokens,
  getFreshAccessToken,
};
