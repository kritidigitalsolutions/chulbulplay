const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");

// Load Models
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Episode = require("../models/episode.model");

const BUNNY_CDN_URL = (process.env.BUNNY_CDN_URL || "").trim().replace(/\/+$/, "");

const dryRun = !process.argv.includes("--fix");

if (!BUNNY_CDN_URL) {
  console.error("❌ Error: BUNNY_CDN_URL is not defined in your environment variables.");
  process.exit(1);
}

const migrateUrl = (val) => {
  if (!val || typeof val !== "string") return val;
  if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(val)) return val; // Already a URL
  
  if (val.startsWith("/uploads/") || val.startsWith("uploads/")) {
    const cleanPath = val.replace(/^\/?uploads\//, "");
    return `${BUNNY_CDN_URL}/${cleanPath}`;
  }
  return val;
};

const run = async () => {
  console.log("====================================================");
  console.log(`🚀 Starting Database Migration Script (${dryRun ? "DRY RUN" : "MIGRATE/FIX MODE"})`);
  console.log(`📍 Target Bunny CDN URL: ${BUNNY_CDN_URL}`);
  console.log("====================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    let totalInspected = 0;
    let totalMigrated = 0;

    const migrationSummary = [];

    // --- 1. MOVIES ---
    const movies = await Movie.find({});
    console.log(`Inspecting ${movies.length} movies...`);
    for (const doc of movies) {
      let changed = false;
      totalInspected++;

      const fieldsToCheck = ["poster", "banner", "videoUrl", "trailerUrl"];
      const updates = {};

      for (const field of fieldsToCheck) {
        if (doc[field]) {
          const newVal = migrateUrl(doc[field]);
          if (newVal !== doc[field]) {
            updates[field] = { from: doc[field], to: newVal };
            doc[field] = newVal;
            changed = true;
          }
        }
      }

      // Check cast
      if (doc.cast && doc.cast.length > 0) {
        doc.cast.forEach((c, idx) => {
          if (c.image) {
            const newVal = migrateUrl(c.image);
            if (newVal !== c.image) {
              updates[`cast[${idx}].image`] = { from: c.image, to: newVal };
              c.image = newVal;
              changed = true;
            }
          }
        });
      }

      if (changed) {
        totalMigrated++;
        migrationSummary.push({
          type: "Movie",
          id: doc._id,
          title: doc.title,
          updates,
        });
        if (!dryRun) {
          await doc.save();
        }
      }
    }

    // --- 2. SERIES ---
    const series = await Series.find({});
    console.log(`Inspecting ${series.length} series...`);
    for (const doc of series) {
      let changed = false;
      totalInspected++;

      const fieldsToCheck = ["poster", "banner"];
      const updates = {};

      for (const field of fieldsToCheck) {
        if (doc[field]) {
          const newVal = migrateUrl(doc[field]);
          if (newVal !== doc[field]) {
            updates[field] = { from: doc[field], to: newVal };
            doc[field] = newVal;
            changed = true;
          }
        }
      }

      // Check cast
      if (doc.cast && doc.cast.length > 0) {
        doc.cast.forEach((c, idx) => {
          if (c.image) {
            const newVal = migrateUrl(c.image);
            if (newVal !== c.image) {
              updates[`cast[${idx}].image`] = { from: c.image, to: newVal };
              c.image = newVal;
              changed = true;
            }
          }
        });
      }

      if (changed) {
        totalMigrated++;
        migrationSummary.push({
          type: "Series",
          id: doc._id,
          title: doc.title,
          updates,
        });
        if (!dryRun) {
          await doc.save();
        }
      }
    }

    // --- 3. EPISODES ---
    const episodes = await Episode.find({});
    console.log(`Inspecting ${episodes.length} episodes...`);
    for (const doc of episodes) {
      let changed = false;
      totalInspected++;

      const fieldsToCheck = ["thumbnail", "videoUrl"];
      const updates = {};

      for (const field of fieldsToCheck) {
        if (doc[field]) {
          const newVal = migrateUrl(doc[field]);
          if (newVal !== doc[field]) {
            updates[field] = { from: doc[field], to: newVal };
            doc[field] = newVal;
            changed = true;
          }
        }
      }

      if (changed) {
        totalMigrated++;
        migrationSummary.push({
          type: "Episode",
          id: doc._id,
          title: doc.title || `Episode ${doc.episodeNumber}`,
          updates,
        });
        if (!dryRun) {
          await doc.save();
        }
      }
    }

    // --- REPORT RESULTS ---
    console.log("\n====================================================");
    console.log("📊 MIGRATION SUMMARY");
    console.log("====================================================");
    console.log(`Total Documents Inspected: ${totalInspected}`);
    console.log(`Total Documents Requiring Migration: ${migrationSummary.length}`);
    console.log(`Total Documents Migrated: ${dryRun ? 0 : totalMigrated}`);
    console.log("====================================================\n");

    if (migrationSummary.length > 0) {
      console.log("Matched Records Details:");
      migrationSummary.forEach((item) => {
        console.log(`\n• [${item.type}] "${item.title}" (ID: ${item.id})`);
        Object.entries(item.updates).forEach(([field, val]) => {
          console.log(`  └─ ${field}:`);
          console.log(`      From: "${val.from}"`);
          console.log(`      To:   "${val.to}"`);
        });
      });
    } else {
      console.log("🎉 Outstanding! No legacy local filesystem paths (/uploads/...) found in the database.");
    }

    if (dryRun && migrationSummary.length > 0) {
      console.log("\n💡 Run this script with the '--fix' flag to apply these changes to the database:");
      console.log("   node scripts/migrate-upload-urls.js --fix");
    }

    await mongoose.connection.close();
    console.log("\nClosed MongoDB connection. Done!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

run();
