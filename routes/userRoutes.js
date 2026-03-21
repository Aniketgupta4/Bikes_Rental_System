const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/userController");
const { ensureUser } = require("../middleware/auth");

// Dashboard & Profile
router.get("/user/dashboard", ensureUser, userCtrl.dashboard);
router.get("/user/profile", ensureUser, (req, res) => {
  res.render("profile", { user: req.session.user });
});

// Booking Action
router.post("/user/book/:id", ensureUser, userCtrl.bookBike);


module.exports = router;