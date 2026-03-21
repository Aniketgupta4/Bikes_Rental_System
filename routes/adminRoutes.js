const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/adminController");
const { ensureAdmin } = require("../middleware/auth");
const upload = require("../config/upload");

// ==========================================
// 1. DASHBOARD & ANALYTICS
// ==========================================
router.get("/admin/dashboard", ensureAdmin, adminCtrl.dashboard);
router.get("/admin/export-bookings", ensureAdmin, adminCtrl.exportBookings);

// ==========================================
// 2. BIKE MANAGEMENT (CRUD)
// ==========================================
router.get("/admin/add-bike", ensureAdmin, adminCtrl.addBikePage);
router.post("/admin/add-bike", ensureAdmin, upload.single("image"), adminCtrl.addBike);

router.get("/admin/edit-bike/:id", ensureAdmin, adminCtrl.editBikePage);
router.post("/admin/edit-bike/:id", ensureAdmin, upload.single("image"), adminCtrl.updateBike);

router.post("/admin/delete-bike/:id", ensureAdmin, adminCtrl.deleteBike);

// ==========================================
// 3. BOOKING OPERATIONS (Lifecycle)
// ==========================================

// Step 1: Approve/Reject Request
router.get("/admin/approve/:id", ensureAdmin, adminCtrl.approveBooking);
router.get("/admin/reject/:id", ensureAdmin, adminCtrl.rejectBooking);

// Step 2: Handover (Fixed path and controller name)
router.get("/admin/start-trip/:id", ensureAdmin, adminCtrl.startTrip);

// Step 3: Return/Complete (Fixed path and controller name)
router.get("/admin/complete-trip/:id", ensureAdmin, adminCtrl.completeTrip);

// Step 4: Cleanup
router.post("/admin/delete-booking/:id", ensureAdmin, adminCtrl.deleteBooking);

module.exports = router;