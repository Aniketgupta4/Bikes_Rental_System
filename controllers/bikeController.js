const Bike = require("../models/Bike");
const Booking = require("../models/Booking");
const Coupon = require("../models/Coupon");
const User = require("../models/User"); // 🔥 NAYA: Fresh user check ke liye import kiya

// ---------------------------------------------------------
// 1. Home Page: List all bikes with ADVANCED FILTERS
// ---------------------------------------------------------
exports.home = async (req, res) => {
  try {
    const { search, maxPrice, rating, status } = req.query;
    let queryObj = {};

    if (search && search.trim() !== "") {
      queryObj.name = { $regex: search.trim(), $options: 'i' };
    }

    if (maxPrice && !isNaN(maxPrice)) {
      queryObj.pricePerDay = { $lte: Number(maxPrice) };
    }

    if (rating && Number(rating) > 0) {
      queryObj.averageRating = { $gte: Number(rating) };
    }

    let bikes = await Bike.find(queryObj).sort({ createdAt: -1 }).lean();
    const now = new Date();

    for (let bike of bikes) {
      const activeBooking = await Booking.findOne({
        bike: bike._id,
        status: "ongoing",
        pickupDateTime: { $lte: now }, 
        returnDateTime: { $gte: now }  
      });
      bike.isCurrentlyRented = !!activeBooking; 
    }

    if (status === 'available') {
      bikes = bikes.filter(b => !b.isCurrentlyRented && !b.isMaintenance && b.isAvailable);
    }

    // Dynamic Coupons Fetch (Home page pe dikhane ke liye)
    const activeCoupons = await Coupon.find({ 
      expiryDate: { $gt: new Date() }, 
      isActive: true 
    });

    res.render("home", { 
      bikes, 
      coupons: activeCoupons, // 🔥 Send coupons to home
      user: req.session.user || null,
      filters: req.query 
    });
  } catch (err) {
    console.error("Home Page Error:", err);
    res.render("home", { bikes: [], coupons: [], user: null, filters: {} });
  }
};

// ---------------------------------------------------------
// 2. Bike Details: Show specific bike info & Coupons
// ---------------------------------------------------------
exports.details = async (req, res) => {
  try {
    const bikeData = await Bike.findById(req.params.id).populate('reviews.user');
    
    if (!bikeData) {
      return res.redirect("/");
    }

    const bike = bikeData.toObject();
    const now = new Date();
    
    const activeBooking = await Booking.findOne({
      bike: bike._id,
      status: "ongoing",
      pickupDateTime: { $lte: now },
      returnDateTime: { $gte: now }
    });
    
    bike.isCurrentlyRented = !!activeBooking;

    // 🔥 NAYA: Fetch FRESH USER from DB for the Welcome Popup
    let freshUser = null;
    if (req.session.user) {
        freshUser = await User.findById(req.session.user._id);
    }

    // Active Coupons Fetch
    const activeCoupons = await Coupon.find({ 
      expiryDate: { $gt: new Date() },
      isActive: true
    });

    res.render("bikeDetails", { 
      bike: bike, 
      coupons: activeCoupons, 
      user: freshUser || null // 🔥 Send fresh user to frontend
    });
  } catch (err) {
    console.error("Details Page Error:", err);
    res.redirect("/");
  }
};

// ---------------------------------------------------------
// 3. API: Validate Coupon (AJAX)
// ---------------------------------------------------------
exports.validateCoupon = async (req, res) => {
    try {
        const { code, totalAmount } = req.body;
        
        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid Coupon Code!" });
        }

        if (new Date() > coupon.expiryDate) {
            return res.json({ success: false, message: "This coupon has expired!" });
        }

        // 🔥 NAYA: DATABASE se Fresh User Check (Session se nahi)
        const freshUser = await User.findById(req.session.user._id);

        if (coupon.isFirstTimeOnly && (!freshUser || !freshUser.isFirstTimeUser)) {
            return res.json({ success: false, message: "This is for new users only!" });
        }

        if (totalAmount < coupon.minBookingAmount) {
            return res.json({ success: false, message: `Min amount should be ₹${coupon.minBookingAmount}` });
        }

        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (totalAmount * coupon.discountValue) / 100;
        } else {
            discount = coupon.discountValue;
        }

        res.json({ 
            success: true, 
            discount: discount, 
            finalPrice: totalAmount - discount,
            message: "Coupon Applied Successfully!" 
        });

    } catch (err) {
        console.error("Coupon Validation Error:", err);
        res.json({ success: false, message: "Server Error!" });
    }
};