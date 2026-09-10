// scripts/migrate-usertype.js
const path = require("path");

// Load environment variables
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/user.model");

const run = async () => {
  try {
    await connectDB();

    console.log("Starting user collection update...");

    // Update all users who do not have 'userType' field, setting it to 'INDIVIDUAL'
    const resultUserType = await User.updateMany(
      { userType: { $exists: false } },
      { $set: { userType: "INDIVIDUAL" } }
    );
    console.log(`Updated userType for ${resultUserType.modifiedCount} user documents.`);

    // Initialize fcmToken to null if not exists
    const resultFcmToken = await User.updateMany(
      { fcmToken: { $exists: false } },
      { $set: { fcmToken: null } }
    );
    console.log(`Initialized fcmToken field for ${resultFcmToken.modifiedCount} user documents.`);

    // Initialize fcmTokenUpdatedAt to null if not exists
    const resultFcmTokenUpdated = await User.updateMany(
      { fcmTokenUpdatedAt: { $exists: false } },
      { $set: { fcmTokenUpdatedAt: null } }
    );
    console.log(`Initialized fcmTokenUpdatedAt field for ${resultFcmTokenUpdated.modifiedCount} user documents.`);

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
};

run();
