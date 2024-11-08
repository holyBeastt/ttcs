const express = require("express");

// import multer from "multer";
const multer = require("multer");
const path = require("path");
// import path from "path";
var appRoot = require("app-root-path");
const router = express.Router();

const { getClassInfoGvm } = require("../controllers/xemCacLopGvmController");

router.get("/xemCacLopGvm", getClassInfoGvm);

module.exports = router;
