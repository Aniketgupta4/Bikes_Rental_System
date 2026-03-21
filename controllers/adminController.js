const Bike = require("../models/Bike");
const Booking = require("../models/Booking");
const { Parser } = require("json2csv");

// 1. Admin Dashboard - Statistics + Data Fetching
exports.dashboard = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user")
      .populate("bike")
      .sort({ createdAt: -1 });

    const bikes = await Bike.find();
    
    // UI par stats dikhane ke liye calculation
    res.render("adminDashboard", {
      bookings: bookings || [],
      bikes: bikes || [],
      user: req.session.user || null
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.render("adminDashboard", { bookings: [], bikes: [], user: req.session.user || null });
  }
};

// --- BIKE MANAGEMENT (CRUD) ---

exports.addBikePage = (req, res) => {
  res.render("addBike", { bike: null, user: req.session.user || null, message: null });
};

exports.addBike = async (req, res) => {
  try {
    const { name, description, pricePerDay } = req.body;
    const image = req.file ? req.file.path : null;
    await Bike.create({ name, description, pricePerDay, image });
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.render("addBike", { bike: null, user: req.session.user || null, message: "Error adding bike" });
  }
};

exports.editBikePage = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.redirect("/admin/dashboard");
    res.render("editBike", { bike, user: req.session.user || null, message: null });
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

exports.updateBike = async (req, res) => {
  try {
    const { name, description, pricePerDay, isAvailable } = req.body;
    const data = { 
        name, 
        description, 
        pricePerDay, 
        isAvailable: isAvailable === "on" 
    };
    if (req.file && req.file.path) data.image = req.file.path;
    await Bike.findByIdAndUpdate(req.params.id, data);
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

exports.deleteBike = async (req, res) => {
  try {
    await Bike.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

// --- BOOKING OPERATIONS (Fixes your Handover Error) ---

// Step 1: Approve (Reservation confirmed)
exports.approveBooking = async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "approved" });
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

// Step 2: Handover (Start Trip - Bike becomes unavailable on Home)
exports.startTrip = async (req, res) => {
    try {
      // Ye function trigger hoga jab tum 'Handover' button click karoge
      await Booking.findByIdAndUpdate(req.params.id, { status: "ongoing" });
      res.redirect("/admin/dashboard");
    } catch (err) {
      console.error("Start Trip Error:", err);
      res.redirect("/admin/dashboard");
    }
};

// Step 3: Return (Complete Trip - Bike becomes available again)
exports.completeTrip = async (req, res) => {
    try {
      await Booking.findByIdAndUpdate(req.params.id, { status: "completed" });
      res.redirect("/admin/dashboard");
    } catch (err) {
      res.redirect("/admin/dashboard");
    }
};

// Step 4: Reject/Cancel (Free the reserved slot)
exports.rejectBooking = async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "rejected" });
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

// Cleanup Record
exports.deleteBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

// --- DATA EXPORT ---

exports.exportBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("user").populate("bike");

    const fields = [
      { label: 'Customer', value: 'user.name' },
      { label: 'Bike', value: 'bike.name' },
      { label: 'Pickup Time', value: 'pickupDateTime' },
      { label: 'Return Time', value: 'returnDateTime' },
      { label: 'Total Bill', value: 'totalPrice' },
      { label: 'Status', value: 'status' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(bookings);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Rental_Report_${new Date().toLocaleDateString()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("Export Error:", err);
    res.redirect("/admin/dashboard");
  }
};