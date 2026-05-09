const admin = require("firebase-admin");
const pool = require("../config/Pool");
const fs = require("fs");
const path = require("path");

/**
 * Initialize Firebase Admin SDK
 * Note: The service account key should be placed at the root of the project as firebase-service-account.json
 */
try {
  const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully");
    }
  } else {
    console.warn(`Firebase Admin SDK NOT initialized: File not found at ${serviceAccountPath}`);
  }
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
}

/**
 * Send a push notification to specific device tokens
 * @param {string[]} tokens - List of FCM tokens
 * @param {object} notification - Notification content { title, body }
 * @param {object} data - Optional data payload
 */
const sendPushNotification = async (tokens, notification, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification,
    data,
    tokens,
    android: {
      priority: "high",
      notification: {
        channelId: "high_importance_channel",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages`);

    // Handle failures (e.g., remove invalid tokens)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log("Failed tokens:", failedTokens);
      // Logic to remove failed tokens from DB could go here
    }

    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
};

/**
 * Send notification to a specific user by their ID
 * @param {number} userId 
 * @param {object} notification 
 * @param {object} data 
 */
const sendToUser = async (userId, notification, data = {}) => {
  try {
    const [rows] = await pool.query(
      "SELECT token FROM user_device_tokens WHERE id_User = ?",
      [userId]
    );

    if (rows.length === 0) return;

    const tokens = rows.map(r => r.token);
    return await sendPushNotification(tokens, notification, data);
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
  }
};

module.exports = {
  sendPushNotification,
  sendToUser,
};
