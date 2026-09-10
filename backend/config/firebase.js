const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let firebaseInitialized = false;

try {
  const configuredServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(__dirname, "..", process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : null;

  // Option 1: Use the explicitly configured service-account file.
  if (configuredServiceAccountPath && fs.existsSync(configuredServiceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(configuredServiceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized from the configured service-account file.");
  // Option 2: Initialize using environment variables if present.
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully via environment variables.");
  } else {
    // Option 3: Fallback to the legacy local service-account file if present.
    const serviceAccountPath = path.join(__dirname, "../firebase/serviceAccountkey.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin SDK initialized successfully via serviceAccountKey.json.");
    } else {
      console.warn("⚠️ Firebase credentials missing in both environment variables and serviceAccountKey.json. FCM service running in mock/stub mode.");
    }
  }
} catch (error) {
  console.error("❌ Firebase Admin SDK Initialization Error:", error);
}

module.exports = {
  admin,
  firebaseInitialized,
};
