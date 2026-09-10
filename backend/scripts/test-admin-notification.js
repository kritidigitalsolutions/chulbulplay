require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { sendPushNotification } = require('../utils/fcm.service');

const run = async () => {
  await connectDB();

  // Find any user to use as createdBy
  const adminUser = await User.findOne({});
  if (!adminUser) {
    console.error('❌ No user found in DB');
    process.exit(1);
  }

  const payload = {
    title: "🔔 Admin Test Notification",
    message: "Admin panel flow verification. Agar yeh popup mein dikh raha hai toh admin flow bilkul sahi hai!",
    type: "GENERAL",
    metadata: { actionUrl: "/plans" },
    createdBy: adminUser._id,
    sentAt: new Date()
  };

  payload.targetUser = null;
  payload.targetUserType = "ALL";

  const notification = await Notification.create(payload);
  console.log("✅ Created database notification entry:", notification._id);

  const users = await User.find({
    fcmToken: { $type: 'string', $ne: '' }
  }).select('_id name phone fcmToken');

  console.log(`📱 Found ${users.length} users with FCM tokens. Sending...`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const result = await sendPushNotification({
      token: user.fcmToken,
      title: payload.title,
      body: payload.message,
      data: {
        notificationId: notification._id.toString(),
        type: payload.type,
        actionUrl: "/plans"
      }
    });

    console.log(`Push to ${user.phone}:`, result);
    if (result.success) sent++;
    else failed++;
  }

  console.log(`\n📊 Report: Sent ${sent}, Failed ${failed}`);
  await mongoose.connection.close();
};

run().catch(e => { console.error(e); process.exit(1); });
