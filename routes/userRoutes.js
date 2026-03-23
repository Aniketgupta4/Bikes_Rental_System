const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/userController");
const { ensureUser } = require("../middleware/auth");
const userController = require("../controllers/userController");

// Dashboard & Profile
router.get("/user/dashboard", ensureUser, userCtrl.dashboard);
router.get("/user/profile", ensureUser, (req, res) => {
  res.render("profile", { user: req.session.user });
});

// Booking Action
router.post("/user/book/:id", ensureUser, userCtrl.bookBike);


// Pehle ye tha: router.post("/cancel-booking/:id", userController.cancelBooking);

// Ab ye kar do (Consistency ke liye /user/ jodo aur ensureUser middleware bhi lagao):
router.post("/user/cancel-booking/:id", ensureUser, userController.cancelBooking);// Pehle ye tha: router.post("/cancel-booking/:id", userController.cancelBooking);

// Ab ye kar do (Consistency ke liye /user/ jodo aur ensureUser middleware bhi lagao):
router.post("/user/cancel-booking/:id", ensureUser, userController.cancelBooking);

router.post('/review/:bookingId', ensureUser, userController.submitReview);

module.exports = router;