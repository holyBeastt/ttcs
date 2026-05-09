const admin = require("firebase-admin");
const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

/**
 * Standalone Diagnostic Tool for Global Push Notifications
 */
async function testGlobalPush() {
  console.log("Starting Global Push Notification Test...");

  // 1. Init Firebase
  const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Error: Service account file not found at ${serviceAccountPath}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK initialized.");

  // 2. Get all tokens from DB
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    const [tokenRows] = await connection.query("SELECT token FROM user_device_tokens");
    const tokens = tokenRows.map(r => r.token);

    if (tokens.length === 0) {
      console.warn("No device tokens found in the database. Please register a device first.");
      return;
    }

    console.log(`Found ${tokens.length} tokens. Sending global test message...`);

    // 3. Send message
    const message = {
      notification: {
        title: "Test Thông báo Toàn cục",
        body: "Đây là tin nhắn thử nghiệm từ hệ thống quản trị.",
      },
      data: {
        type: "TEST_BROADCAST",
        timestamp: new Date().toISOString()
      },
      tokens: tokens,
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          priority: "max",
          visibility: "public",
          sound: "default",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages.`);
    if (response.failureCount > 0) {
      console.warn(`${response.failureCount} messages failed.`);
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          console.error(`Token ${idx} error:`, res.error.message);
        }
      });
    }

  } catch (error) {
    console.error("Critical error during test:", error);
  } finally {
    await connection.end();
    console.log("Test execution finished.");
  }
}

testGlobalPush();
