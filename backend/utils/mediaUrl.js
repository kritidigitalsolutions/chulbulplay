const fs = require("fs");
const path = require("path");

/**
 * Ensures media URLs are returned as full Bunny CDN URLs when relative / upload paths are stored.
 */
const formatMediaUrl = (val) => {
  if (!val || typeof val !== "string") return val || "";
  const trimmed = val.trim();
  if (!trimmed) return "";

  // Already a full remote URL (http://, https://, data:, blob:)
  if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  const bunnyUrl = (process.env.BUNNY_CDN_URL || "https://chulbulplay.b-cdn.net").trim().replace(/\/+$/, "");

  // Strip leading /uploads/ or slashes and prepend Bunny CDN
  const cleanPath = trimmed.replace(/^\/?uploads\//, "").replace(/^\/+/, "");
  return bunnyUrl ? `${bunnyUrl}/${cleanPath}` : trimmed;
};

/**
 * Resolves a stored media path: if it is a local /uploads/... file that exists on disk,
 * returns its full backend URL (or relative /uploads/... path); otherwise falls back to CDN URL.
 */
const resolveLocalOrCdnUrl = (val, req = null) => {
  if (!val || typeof val !== "string") return val || "";
  const trimmed = val.trim().replace(/\\/g, "/");
  if (!trimmed) return "";

  if (/^(https?:\/\/|data:|blob:|\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    const relPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const localFile = path.resolve(__dirname, "..", `.${relPath}`);
    if (fs.existsSync(localFile)) {
      if (req && typeof req.get === "function" && req.get("host")) {
        const proto = req.headers?.["x-forwarded-proto"] || req.protocol || "http";
        return `${proto}://${req.get("host")}${relPath}`;
      }
      return relPath;
    }
  }

  return formatMediaUrl(trimmed);
};

const getMediaUrl = (file, fallback = "") => {
  if (!file) return formatMediaUrl(fallback);
  return formatMediaUrl(file.cdnUrl || file.path || fallback);
};

/**
 * Deletes a locally stored /uploads/... file. Existing remote URLs are left
 * untouched while Bunny CDN is disabled.
 */
const deleteMedia = async (filePath) => {
  if (!filePath || typeof filePath !== "string" || filePath.startsWith("http")) {
    return;
  }

  try {
    const normalizedPath = filePath.replace(/\\/g, "/");
    if (!normalizedPath.startsWith("/uploads/")) {
      return;
    }

    const uploadsRoot = path.resolve(__dirname, "../uploads");
    const fullPath = path.resolve(__dirname, "..", `.${normalizedPath}`);
    if (!fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
      return;
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error("Local file deletion error:", err.message);
  }
};

const deleteMediaFiles = async (...files) => {
  await Promise.all(files.filter(Boolean).map((file) => deleteMedia(file)));
};

module.exports = {
  formatMediaUrl,
  resolveLocalOrCdnUrl,
  getMediaUrl,
  deleteMedia,
  deleteMediaFiles,
};
