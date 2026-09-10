const bcrypt = require("bcryptjs");

const Admin = require("../models/admin.model");

const createDefaultAdmin = async () => {
  try {
    if (
      !process.env.DEFAULT_ADMIN_EMAIL ||
      !process.env.DEFAULT_ADMIN_PASSWORD
    ) {
      console.log("⚠️ Default admin credentials missing");
      return;
    }

    const normalizedEmail =
      process.env.DEFAULT_ADMIN_EMAIL
        .trim()
        .toLowerCase();

    const hashedPassword = await bcrypt.hash(
      process.env.DEFAULT_ADMIN_PASSWORD,
      10
    );

    await Admin.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          password: hashedPassword,
          role: "ADMIN",
        },
        $setOnInsert: {
          name: "Admin",
          email: normalizedEmail,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    console.log("✅ Default admin credentials synchronized");

  } catch (error) {
    console.error(
      "❌ Create Default Admin Error:",
      error
    );
  }
};

module.exports = createDefaultAdmin;
