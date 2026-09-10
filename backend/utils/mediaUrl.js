const fs = require("fs");
const path = require("path");

const getMediaUrl = (file, fallback = "") => {
  if (!file) return fallback;
  return file.cdnUrl || file.path || fallback;
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

module.exports = { getMediaUrl, deleteMedia, deleteMediaFiles };
