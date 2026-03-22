const Bike = require("../models/Bike");
const Booking = require("../models/Booking");
const { Parser } = require("json2csv");

// 1. Admin Dashboard - Statistics & Data Fetching
exports.dashboard = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user")
      .populate("bike")
      .sort({ createdAt: -1 });

    const bikes = await Bike.find();
    
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
    
    // Cloudinary URL logic (Permanent Online Link)
    const image = req.file ? req.file.path : null; 

    await Bike.create({ 
        name, 
        description, 
        pricePerDay, 
        image, 
        isAvailable: true, // Default Available
        isMaintenance: false // Default Not in Maintenance
    });

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Add Bike Error:", err);
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
    const bike = await Bike.findById(req.params.id);

    let finalAvailable = false;
    let finalMaintenance = false;

    // 👇 NAYA SMART LOGIC: Tick = Available, Untick = In Service 👇
    if (isAvailable === "on") {
        // Ticked
        finalAvailable = true;
        finalMaintenance = false;
    } else {
        // Unticked
        if (bike.isAvailable === false && bike.isMaintenance === false) {
            // Agar bike pehle se Booked thi, toh usko Booked hi rehne do
            finalAvailable = false;
            finalMaintenance = false;
        } else {
            // Agar normal untick kiya hai, toh Maintenance mein daal do
            finalAvailable = false;
            finalMaintenance = true;
        }
    }

    const updateData = { 
        name, 
        description, 
        pricePerDay, 
        isAvailable: finalAvailable,
        isMaintenance: finalMaintenance
    };

    // Cloudinary update check
    if (req.file && req.file.path) {
        updateData.image = req.file.path;
    }

    await Bike.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Update Error:", err);
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

// --- BOOKING OPERATIONS (Lifecycle & Status Sync) ---

exports.approveBooking = async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "approved" });
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

exports.startTrip = async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      booking.status = "ongoing";
      await booking.save();

      // Bike is now Booked (Available=false, Maintenance=false)
      const bikeId = booking.bike._id || booking.bike;
      await Bike.findByIdAndUpdate(bikeId, { isAvailable: false, isMaintenance: false });

      res.redirect("/admin/dashboard");
    } catch (err) {
      console.error("Handover Error:", err);
      res.redirect("/admin/dashboard");
    }
};

exports.completeTrip = async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      booking.status = "completed";
      await booking.save();

      // Bike is returned, make it Available
      const bikeId = booking.bike._id || booking.bike;
      await Bike.findByIdAndUpdate(bikeId, { isAvailable: true, isMaintenance: false });

      res.redirect("/admin/dashboard");
    } catch (err) {
      console.error("Complete Trip Error:", err);
      res.redirect("/admin/dashboard");
    }
};

exports.rejectBooking = async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "rejected" });
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.redirect("/admin/dashboard");
  }
};

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
      { label: 'Total Bill (INR)', value: 'totalPrice' },
      { label: 'Trip Status', value: 'status' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(bookings);

    res.header('Content-Type', 'text/csv');
    res.attachment(`BikeRental_Report_${new Date().toLocaleDateString()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("CSV Export Error:", err);
    res.redirect("/admin/dashboard");
  }
};