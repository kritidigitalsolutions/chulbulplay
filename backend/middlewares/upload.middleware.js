const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { pipeline } = require("stream");

const getUploadInfo = (req, file) => {
  let type = "movies";

  if (req.originalUrl.includes("/series")) type = "series";
  if (req.originalUrl.includes("/episodes")) type = "episodes";
  if (req.originalUrl.includes("/user")) type = "profile";
  if (req.originalUrl.includes("/banners")) type = "banners";
  if (req.originalUrl.includes("/posters")) type = "posters";

  let subfolder = "others";

  if (file.fieldname === "poster" || file.fieldname === "thumbnail") {
    subfolder = "posters";
  } else if (file.fieldname === "banner") {
    subfolder = "banners";
  } else if (file.fieldname === "image") {
    subfolder = req.originalUrl.includes("/banners") ? "banners" : "posters";
  } else if (file.fieldname === "video") {
    subfolder = "videos";
  } else if (file.fieldname === "trailer") {
    subfolder = "trailers";
  } else if (file.fieldname.startsWith("castImage_")) {
    subfolder = "cast";
  } else if (file.fieldname === "attachments") {
    subfolder = "attachments";
  }

  return {
    type,
    subfolder,
    remoteFolder: `${type}/${subfolder}`,
  };
};

const storage = {
  _handleFile: async (req, file, cb) => {
    try {
      const uploadInfo = getUploadInfo(req, file);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${uniqueName}${ext}`;

      console.log("================================");
      console.log("UPLOAD START");
      console.log("FIELD:", file.fieldname);
      console.log("NAME:", file.originalname);
      console.log("TYPE:", file.mimetype);
      console.log("TARGET:", `${uploadInfo.remoteFolder}/${filename}`);

      // Local storage is the active upload provider. Bunny CDN can be restored
      // later without changing the upload route contract.
      const localDir = path.join(__dirname, "..", "uploads", uploadInfo.remoteFolder);
      await fsPromises.mkdir(localDir, { recursive: true });
      const localFilePath = path.join(localDir, filename);

      const outStream = fs.createWriteStream(localFilePath);
      pipeline(file.stream, outStream, (err) => {
        if (err) {
          console.error("Local file write error:", err);
          return cb(err);
        }

        const relativeUrl = `/uploads/${uploadInfo.remoteFolder}/${filename}`;
        console.log("LOCAL UPLOAD SUCCESS:", relativeUrl);
        console.log("================================");

        cb(null, {
          filename,
          destination: uploadInfo.remoteFolder,
          path: relativeUrl,
          cdnUrl: relativeUrl,
          remotePath: relativeUrl,
        });
      });
    } catch (error) {
      console.error("UPLOAD ERROR:", error.message);
      cb(error);
    }
  },

  _removeFile: (req, file, cb) => {
    if (file.path && typeof file.path === "string" && file.path.startsWith("/uploads/")) {
      const localPath = path.join(__dirname, "..", file.path);
      fs.unlink(localPath, () => {});
    }
    cb(null);
  },
};

// Accept every file type for local testing. Reinstate a MIME allow-list before
// exposing uploads publicly or moving them to production storage.
const fileFilter = (req, file, cb) => cb(null, true);

const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
});

module.exports = upload;
