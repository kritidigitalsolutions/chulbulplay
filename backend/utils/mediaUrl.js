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

module.exports = { formatMediaUrl, getMediaUrl, deleteMedia, deleteMediaFiles };

