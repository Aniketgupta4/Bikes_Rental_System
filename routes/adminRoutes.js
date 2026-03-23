const express = require("express");
const router = express.Router();
// Variable ka naam change karke adminController kar diya hai
const adminController = require("../controllers/adminController"); 
const { ensureAdmin } = require("../middleware/auth");
const upload = require("../config/upload");

// ==========================================
// 1. DASHBOARD & ANALYTICS
// ==========================================
router.get("/admin/dashboard", ensureAdmin, adminController.dashboard);
router.get("/admin/export-bookings", ensureAdmin, adminController.exportBookings);

// ==========================================
// 2. BIKE MANAGEMENT (CRUD)
// ==========================================
router.get("/admin/add-bike", ensureAdmin, adminController.addBikePage);
router.post("/admin/add-bike", ensureAdmin, upload.single("image"), adminController.addBike);

router.get("/admin/edit-bike/:id", ensureAdmin, adminController.editBikePage);
router.post("/admin/edit-bike/:id", ensureAdmin, upload.single("image"), adminController.updateBike);

router.post("/admin/delete-bike/:id", ensureAdmin, adminController.deleteBike);

// ==========================================
// 3. BOOKING OPERATIONS (Lifecycle)
// ==========================================

// Step 1: Approve/Reject Request
router.get("/admin/approve/:id", ensureAdmin, adminController.approveBooking);
router.get("/admin/reject/:id", ensureAdmin, adminController.rejectBooking);

// Step 2: Handover
router.get("/admin/start-trip/:id", ensureAdmin, adminController.startTrip);

// Step 3: Return/Complete
router.get("/admin/complete-trip/:id", ensureAdmin, adminController.completeTrip);

// Step 4: Cleanup
router.post("/admin/delete-booking/:id", ensureAdmin, adminController.deleteBooking);

// Analytics Page Route - AB YE SAHI CHALEGA!
router.get("/admin/analytics", ensureAdmin, adminController.getAnalytics);

router.get("/manage-coupons", ensureAdmin, adminController.manageCoupons);
router.post("/add-coupon", ensureAdmin, adminController.addCoupon);
// AJAX delete ke liye
router.delete("/delete-coupon/:id", ensureAdmin, adminController.deleteCoupon);


module.exports = router;