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
 * @param {string} [params.image] - Optional notification image URL
 * @param {Object} [params.data] - Optional metadata (converted to key-value strings)
 */
const sendPushNotification = async ({ token, title, body, image, data }) => {
  try {
    if (!token) {
      return { success: false, error: "No token provided" };
    }

    const rawImage = image && typeof image === "string" ? image.trim() : "";
    const cleanImage = /^https?:\/\//i.test(rawImage) ? rawImage : "";

    if (!firebaseInitialized) {
      console.log("-----------------------------------------");
      console.log("PUSH NOTIFICATION SENT (MOCK/STUB MODE)");
      console.log("To:", token);
      console.log("Title:", title);
      console.log("Body:", body);
      if (cleanImage) console.log("Image:", cleanImage);
      console.log("Data:", data);
      console.log("-----------------------------------------");
      return { success: true, messageId: `mock-id-${Date.now()}` };
    }

    // Convert data fields to strings, as FCM data payload requires string values
    const stringifiedData = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          stringifiedData[key] = String(data[key]);
        }
      });
    }

    const message = {
      token,
      notification: {
        title,
        body,
        ...(cleanImage ? { imageUrl: cleanImage } : {}),
      },
      data: stringifiedData,
      android: {
        priority: "high",                    // Deliver immediately, wake device screen
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          channelId: process.env.FCM_CHANNEL_ID || "chulbulplay_channel",
          ...(cleanImage ? { imageUrl: cleanImage } : {}),
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
            ...(cleanImage ? { "mutable-content": 1 } : {}),
          },
        },
        ...(cleanImage ? { fcmOptions: { imageUrl: cleanImage } } : {}),
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
