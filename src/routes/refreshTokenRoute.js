const express = require("express");
const router = express.Router();
const refresh = require("../controllers/refreshTokenController");

// Thường thì các endpoint này được gắn vào api/mobile. 
// Bạn có thể đăng ký trong server.js với app.use('/api/mobile/v1', refreshTokenRoute)
router.post("/refresh", refresh);

module.exports = router;
