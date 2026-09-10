require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user.model');
const { sendPushNotification } = require('../utils/fcm.service');

const run = async () => {
  await connectDB();

  const users = await User.find({
    fcmToken: { $type: 'string', $ne: '' }
  }).select('_id name phone fcmToken fcmTokenUpdatedAt');

  console.log('\n📱 Users with FCM tokens:', users.length);

  if (users.length === 0) {
    console.log('❌ No users have FCM tokens saved. Token was never uploaded from the app.');
    process.exit(0);
  }

  users.forEach((u, i) => {
    console.log(`\n[${i + 1}] Phone  : ${u.phone}`);
    console.log(`     Token  : ${u.fcmToken.substring(0, 40)}...`);
    console.log(`     Updated: ${u.fcmTokenUpdatedAt}`);
  });

  console.log('\n🚀 Sending test notification to all users...\n');

  for (const user of users) {
    const result = await sendPushNotification({
      token: user.fcmToken,
      title: '🔔 Test Notification',
      body: 'Agar yeh popup mein dikh raha hai toh backend bilkul sahi hai!',
      data: { type: 'TEST' }
    });
    console.log(`Push → ${user.phone}:`, JSON.stringify(result));
  }

  await mongoose.connection.close();
};

run().catch(e => { console.error(e); process.exit(1); });
