const {
  admin,
  firebaseInitialized,
} = require("../config/firebase");

/**
 * Sends a real or mock push notification using Firebase Cloud Messaging.
 * @param {Object} params
 * @param {string} params.token - Target FCM token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body content
 * @param {Object} [params.data] - Optional metadata (converted to key-value strings)
 */
const sendPushNotification = async ({ token, title, body, data }) => {
  try {
    if (!token) {
      return { success: false, error: "No token provided" };
    }

    if (!firebaseInitialized) {
      console.log("-----------------------------------------");
      console.log("PUSH NOTIFICATION SENT (MOCK/STUB MODE)");
      console.log("To:", token);
      console.log("Title:", title);
      console.log("Body:", body);
      console.log("Data:", data);
      console.log("-----------------------------------------");
      return { success: true, messageId: `mock-id-${Date.now()}` };
    }

    // Convert data fields to strings, as FCM data payload requires string values
    const stringifiedData = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        stringifiedData[key] = String(data[key]);
      });
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: "high",                    // Deliver immediately, wake device screen
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          channelId: process.env.FCM_CHANNEL_ID || "chulbulplay_channel",    // Must match Flutter's AndroidNotificationDetails channel ID
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",             // iOS: highest priority
        },
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent FCM notification:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("FCM Send Error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPushNotification };
