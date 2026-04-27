const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const bikeController = require("../controllers/bikeController");
const { ensureUser } = require("../middleware/auth");

// Dashboard & Profile
router.get("/user/dashboard", ensureUser, userController.dashboard);
router.get("/user/profile", ensureUser, (req, res) => {
  res.render("profile", { user: req.session.user });
});

// ==========================================
// 🚀 PAYMENT & BOOKING ROUTES (YAHAN FIX HAI)
// ==========================================
router.post('/api/create-order', ensureUser, userController.createRazorpayOrder);
router.post('/api/verify-payment', ensureUser, userController.verifyRazorpayPayment);
// Ye wala route main pichli baar bhool gaya tha 👇
router.post('/api/book-pay-at-pickup', ensureUser, userController.bookPayAtPickup);

// Cancel Booking & Reviews
router.post("/user/cancel-booking/:id", ensureUser, userController.cancelBooking);
router.post('/review/:bookingId', ensureUser, userController.submitReview);

// Coupon Validation
router.post("/api/validate-coupon", bikeController.validateCoupon);

module.exports = router;