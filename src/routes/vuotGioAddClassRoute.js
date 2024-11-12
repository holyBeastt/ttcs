const express = require('express');
const router = express.Router();
const vuotGioAddClassController = require('../controllers/vuotGioAddClassController');
// const { render } = require('ejs');

router.get("/addclass", (req, res) => {
    res.render("addClass");
  });
router.post("/addclass", vuotGioAddClassController.addClass);
module.exports = router;