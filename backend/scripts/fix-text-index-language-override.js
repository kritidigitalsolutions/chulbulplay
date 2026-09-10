const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const collections = [
  {
    name: "movies",
    keys: {
      title: "text",
      description: "text",
    },
  },
  {
    name: "series",
    keys: {
      title: "text",
      description: "text",
    },
  },
];

const recreateTextIndex = async ({ name, keys }) => {
  const collection = mongoose.connection.collection(name);
  const indexes = await collection.indexes();
  const textIndexes = indexes.filter((index) => {
    return Object.values(index.key || {}).includes("text");
  });

  for (const index of textIndexes) {
    console.log(`Dropping ${name}.${index.name}`);
    await collection.dropIndex(index.name);
  }

  const indexName = await collection.createIndex(keys, {
    default_language: "none",
    language_override: "textLanguage",
  });

  console.log(`Created ${name}.${indexName}`);
};

const run = async () => {
  try {
    await connectDB();

    for (const collection of collections) {
      await recreateTextIndex(collection);
    }

    console.log("Text indexes repaired.");
  } catch (error) {
    console.error("Failed to repair text indexes:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
