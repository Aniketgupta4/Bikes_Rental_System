const Bike = require("../models/Bike");
const Booking = require("../models/Booking");
const { Parser } = require("json2csv");
const Coupon = require("../models/Coupon");

// 1. Admin Dashboard - Statistics, Analytics & DUAL Pagination
exports.dashboard = async (req, res) => {
  try {
    // --- 1. REAL-TIME ANALYTICS (AGGREGATION) ---
    
    // A. Revenue & Booking Status Breakdown
    const statsResult = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { 
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$totalPrice", 0] } 
          },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          ongoing: { $sum: { $cond: [{ $eq: ["$status", "ongoing"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
        }
      }
    ]);

    const stats = statsResult[0] || { 
      totalRevenue: 0, pending: 0, approved: 0, ongoing: 0, completed: 0, cancelled: 0 
    };

    // B. Monthly Revenue Trend (Last 6 Months)
    const monthlyData = await Booking.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" }
        }
      },
      { $sort: { "_id": 1 } },
      { $limit: 6 }
    ]);

    // --- 2. EXISTING STATS KE LIYE TOTAL DATA ---
    const allBikesCount = await Bike.countDocuments();
    const allBookings = await Booking.find();

    // --- 3. BOOKINGS PAGINATION LOGIC (AS IS) ---
    const page = parseInt(req.query.page) || 1;
    const limitBookings = 5;
    const skipBookings = (page - 1) * limitBookings;

    const paginatedBookings = await Booking.find()
      .populate("user")
      .populate("bike")
      .sort({ createdAt: -1 })
      .skip(skipBookings)
      .limit(limitBookings);

    const totalPages = Math.ceil(allBookings.length / limitBookings);

    // --- 4. BIKES PAGINATION LOGIC (AS IS) ---
    const bikePage = parseInt(req.query.bikePage) || 1;
    const limitBikes = 5;
    const skipBikes = (bikePage - 1) * limitBikes;

    const paginatedBikes = await Bike.find()
      .sort({ createdAt: -1 }) 
      .skip(skipBikes)
      .limit(limitBikes);
      
    const totalBikePages = Math.ceil(allBikesCount / limitBikes);

    // --- 5. RENDER WITH ANALYTICS ---
    res.render("adminDashboard", {
      // Analytics Data
      stats,
      monthlyRevenue: JSON.stringify(monthlyData), // JSON string for Chart.js
      
      // Original Data
      allBookings: allBookings || [],
      bookings: paginatedBookings || [],
      currentPage: page,
      totalPages: totalPages,
      
      allBikesCount: allBikesCount,
      bikes: paginatedBikes || [],
      currentBikePage: bikePage,
      totalBikePages: totalBikePages,

      user: req.session.user || null
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.redirect("/");
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

    await Bike.create({ 
        name, 
        description, 
        pricePerDay, 
        image, 
        isAvailable: true, 
        isMaintenance: false 
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

    if (isAvailable === "on") {
        finalAvailable = true;
        finalMaintenance = false;
    } else {
        if (bike.isAvailable === false && bike.isMaintenance === false) {
            finalAvailable = false;
            finalMaintenance = false;
        } else {
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

// --- BOOKING OPERATIONS ---

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

      const bikeId = booking.bike._id || booking.bike;
      await Bike.findByIdAndUpdate(bikeId, { isAvailable: false, isMaintenance: false });

      res.redirect("/admin/dashboard");
    } catch (err) {
      res.redirect("/admin/dashboard");
    }
};

exports.completeTrip = async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      booking.status = "completed";
      await booking.save();

      const bikeId = booking.bike._id || booking.bike;
      await Bike.findByIdAndUpdate(bikeId, { isAvailable: true, isMaintenance: false });

      res.redirect("/admin/dashboard");
    } catch (err) {
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
    res.redirect("/admin/dashboard");
  }
};


exports.getAnalytics = async (req, res) => {
    try {
        // 1. Revenue & Status Breakdown
        const statsResult = await Booking.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$totalPrice", 0] } },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
                }
            }
        ]);

        const stats = statsResult[0] || { totalRevenue: 0, pending: 0, completed: 0, cancelled: 0 };

        // 2. Monthly Revenue (Line Chart)
        const monthlyData = await Booking.aggregate([
            { $match: { status: "completed" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%b %Y", date: "$createdAt" } },
                    revenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Top 5 Most Rented Bikes (Bar Chart)
        const topBikes = await Booking.aggregate([
            { $group: { _id: "$bike", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "bikes",
                    localField: "_id",
                    foreignField: "_id",
                    as: "bikeDetails"
                }
            },
            { $unwind: "$bikeDetails" }
        ]);

        res.render("adminAnalytics", {
            stats,
            monthlyRevenue: JSON.stringify(monthlyData),
            topBikes: JSON.stringify(topBikes),
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.redirect("/admin/dashboard");
    }
};


// 1. Get All Coupons (Dashboard pe dikhane ke liye)
exports.manageCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render("adminCoupons", { coupons, user: req.session.user });
    } catch (err) {
        res.redirect("/admin/dashboard");
    }
};

// 2. Create New Coupon Logic
exports.addCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, expiryDate, isFirstTimeOnly, minAmount } = req.body;
        
        await Coupon.create({
            code,
            discountType,
            discountValue,
            expiryDate,
            minBookingAmount: minAmount || 0,
            isFirstTimeOnly: isFirstTimeOnly === 'on' ? true : false
        });

        res.redirect("/admin/manage-coupons");
    } catch (err) {
        console.error("Coupon Error:", err);
        res.redirect("/admin/dashboard");
    }
};

// 3. Delete Coupon
exports.deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted" });
    } catch (err) {
        res.status(500).send();
    }
};