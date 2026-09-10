require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");

const app = require("./app");

const connectDB = require("./config/db");

const createDefaultAdmin = require("./utils/createDefaultAdmin");

const PORT = process.env.PORT || 5000;


const startServer = async () => {
  try {
    // Connect Database
    await connectDB();

    // Create Default Admin
    await createDefaultAdmin();

    // Start Server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // Support large file uploads by increasing timeouts to 20 minutes
    server.timeout = 20 * 60 * 1000;
    server.keepAliveTimeout = 20 * 60 * 1000;
    server.headersTimeout = 21 * 60 * 1000;



  } catch (error) {
    console.error("❌ Server Error:", error);
    process.exit(1);
  }
};

startServer();