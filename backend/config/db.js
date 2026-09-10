const mongoose = require("mongoose");

let isConnected = false;

mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    if (isConnected) {
      return;
    }

    const uri = process.env.MONGO_URI?.trim();

    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 100,
    });

    isConnected = connection.connections[0].readyState === 1;

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    if (process.env.VERCEL) {
      throw error;
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;