const express = require("express");
const router = express.Router();
const bikeCtrl = require("../controllers/bikeController");

// Home (List of bikes)
router.get("/", bikeCtrl.home);

// Bike Details (Single bike view)
router.get("/bike/:id", bikeCtrl.details);

module.exports = router;