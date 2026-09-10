const MB = 1024 * 1024;
const GB = 1024 * MB;

const limits = {
  poster:       5  * MB,
  banner:       5  * MB,
  thumbnail:    5  * MB,
  profileImage: 2  * MB,
  trailer:      5  * GB,  // 5 GB
  video:        5  * GB,  // 5 GB
};

function validateSingle(file, field) {
  if (!file) return;

  let max;

  if (field.startsWith("castImage_")) {
    max = 2 * MB;
  } else {
    max = limits[field];
  }

  if (max && file.size > max) {
    const display = max >= GB ? `${max / GB}GB` : `${max / MB}MB`;
    throw new Error(`${field} exceeds ${display} limit`);
  }
}

const validateFileSizes = (req, res, next) => {
  try {
    if (req.file) {
      validateSingle(req.file, req.file.fieldname);
    }

    if (req.files) {
      Object.keys(req.files).forEach((field) => {
        const files = Array.isArray(req.files[field])
          ? req.files[field]
          : [req.files[field]];

        files.forEach((file) => validateSingle(file, field));
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = validateFileSizes;