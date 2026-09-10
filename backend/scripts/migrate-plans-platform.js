const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Plan = require("../models/plan.model");
const Subscription = require("../models/subscription.model");

const run = async () => {
  try {
    await connectDB();

    console.log("Setting platform: 'app' on existing plans with missing platform...");
    const planResult = await Plan.updateMany(
      { $or: [{ platform: { $exists: false } }, { platform: null }] },
      { $set: { platform: "app" } }
    );
    console.log(`Updated ${planResult.modifiedCount} plan(s).`);

    console.log("Setting platform: 'app' on existing subscriptions with missing platform...");
    const subResult = await Subscription.updateMany(
      { $or: [{ platform: { $exists: false } }, { platform: null }] },
      { $set: { platform: "app" } }
    );
    console.log(`Updated ${subResult.modifiedCount} subscription(s).`);

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
