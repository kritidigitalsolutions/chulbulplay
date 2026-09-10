// // cdn/firebase.js
// // Reuse the Firebase Admin singleton already initialized by config/firebase.js.
// // This avoids double-initialization errors and keeps credentials in one place.

// const { admin } = require("../config/firebase");

// let bucket = null;

// if (process.env.FIREBASE_BUCKET) {
//   try {
//     bucket = admin.storage().bucket(process.env.FIREBASE_BUCKET);
//   } catch (err) {
//     console.warn("⚠️  Firebase Storage bucket could not be initialized:", err.message);
//   }
// } else {
//   console.warn("⚠️  FIREBASE_BUCKET env var not set – Firebase Storage is disabled.");
// }

// module.exports = { admin, bucket };