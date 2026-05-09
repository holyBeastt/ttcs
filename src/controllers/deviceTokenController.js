const pool = require("../config/Pool");

/**
 * Register a device token for a user
 */
const registerDeviceToken = async (req, res) => {
  const { userId } = req.user; // Assuming user is authenticated and userId is in req.user
  const { token, platform } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_device_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_User INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        platform ENUM('android', 'ios') NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY user_token (id_User, token)
      )
    `);

    // Ensure the token is removed from any other users first (Token Leakage Fix)
    await pool.query(
      "DELETE FROM user_device_tokens WHERE token = ? AND id_User != ?",
      [token, userId]
    );

    // Insert or update for current user
    await pool.query(
      "INSERT INTO user_device_tokens (id_User, token, platform) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE last_updated = CURRENT_TIMESTAMP",
      [userId, token, platform || 'android']
    );

    res.status(200).json({ message: "Device token registered successfully" });
  } catch (error) {
    console.error("Error registering device token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Unregister a device token (e.g., on logout)
 */
const unregisterDeviceToken = async (req, res) => {
  const { userId } = req.user;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    await pool.query(
      "DELETE FROM user_device_tokens WHERE id_User = ? AND token = ?",
      [userId, token]
    );
    res.status(200).json({ message: "Device token unregistered successfully" });
  } catch (error) {
    console.error("Error unregistering device token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const { sendToUser } = require("../services/notificationService");

/**
 * Send a test notification to the current user
 */
const sendTestNotification = async (req, res) => {
  const { userId } = req.user;

  try {
    const result = await sendToUser(userId, {
      title: "Test Notification",
      body: "This is a test notification from the backend!",
    });

    res.status(200).json({ message: "Notification sent", result });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ message: "Error sending notification" });
  }
};

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  sendTestNotification,
};
