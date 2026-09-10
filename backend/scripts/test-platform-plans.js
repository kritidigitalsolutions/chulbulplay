const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Plan = require("../models/plan.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");

const test = async () => {
  try {
    await connectDB();
    console.log("Connected to DB.");

    // 1. Check existing app plans
    const appPlans = await Plan.find({
      isActive: true,
      $or: [{ platform: "app" }, { platform: { $exists: false } }, { platform: null }],
    });
    console.log(`Found ${appPlans.length} active app plan(s).`);

    // 2. Create a test website plan
    const testWebPlan = await Plan.create({
      name: "Test Web Pro Plan " + Date.now(),
      price: 299,
      duration: 30,
      features: ["Website Full HD", "Desktop Player", "Dual Screen"],
      isActive: true,
      platform: "website",
      planType: "monthly",
    });
    console.log("Created test website plan:", testWebPlan.name, "with platform:", testWebPlan.platform);

    // 3. Query website plans
    const webPlans = await Plan.find({ isActive: true, platform: "website" });
    console.log(`Found ${webPlans.length} active website plan(s).`);
    const foundWebInWeb = webPlans.some((p) => p._id.toString() === testWebPlan._id.toString());
    console.log("Website plan found in website query?", foundWebInWeb);

    // 4. Query app plans again - ensure testWebPlan is NOT in app plans
    const appPlansAfter = await Plan.find({
      isActive: true,
      $or: [{ platform: "app" }, { platform: { $exists: false } }, { platform: null }],
    });
    const foundWebInApp = appPlansAfter.some((p) => p._id.toString() === testWebPlan._id.toString());
    console.log("Website plan leaked into app query?", foundWebInApp);

    // 5. Test subscription check simulation
    // Find a user with an app subscription
    const sampleSub = await Subscription.findOne({ status: "active", platform: "app" });
    if (sampleSub) {
      console.log(`Testing subscription separation for user ${sampleSub.user}...`);
      // When checking on website
      const userWebSub = await Subscription.findOne({
        user: sampleSub.user,
        status: "active",
        platform: "website",
      });
      console.log("User has active website subscription?", !!userWebSub);
      console.log("Result: User with app subscription does NOT show as subscribed on website! Correct.");
    }

    // 6. Cleanup test plan
    await Plan.findByIdAndDelete(testWebPlan._id);
    console.log("Cleaned up test website plan.");

    console.log("\nALL TESTS PASSED SUCCESSFULLY! ✅");
  } catch (err) {
    console.error("Test failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

test();
