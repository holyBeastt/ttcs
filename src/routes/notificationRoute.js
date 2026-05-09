const express = require("express");
const router = express.Router();
const deviceTokenController = require("../controllers/deviceTokenController");
const verifyToken = require("../middlewares/jwtMiddleware"); 

// Register/Update device token
router.post("/register", verifyToken, deviceTokenController.registerDeviceToken);

// Unregister device token
router.post("/unregister", verifyToken, deviceTokenController.unregisterDeviceToken);

// Test send notification
router.post("/test-send", verifyToken, deviceTokenController.sendTestNotification);

module.exports = router;
