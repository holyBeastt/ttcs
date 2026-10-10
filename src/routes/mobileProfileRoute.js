const express = require("express");

const verifyToken = require("../middlewares/jwtMiddleware");
const controller = require("../controllers/mobileProfileController");

const router = express.Router();

// Mobile account routes require an Authorization: Bearer token explicitly.
// This prevents browser session cookies from being used for state-changing
// profile/password requests and keeps the user scope tied to the JWT.
router.get("/me", verifyToken, controller.getMe);
router.patch("/me/contact", verifyToken, controller.updateContact);
router.post("/me/change-password", verifyToken, controller.changePassword);

module.exports = router;
