const Bike = require("../models/Bike");
const Booking = require("../models/Booking");
const Coupon = require("../models/Coupon");


// ---------------------------------------------------------
// Home Page: List all bikes with ADVANCED FILTERS & AUTO-availability
// ---------------------------------------------------------
exports.home = async (req, res) => {
  try {
    // 1. URL query parameters ko extract karo
    const { search, maxPrice, rating, status } = req.query;
    
    // 2. Ek empty Database Query Object banao
    let queryObj = {};

    // --- A. SEARCH FILTER (By Bike Name) ---
    if (search && search.trim() !== "") {
      // Case-insensitive search
      queryObj.name = { $regex: search.trim(), $options: 'i' };
    }

    // --- B. MAX PRICE FILTER ---
    if (maxPrice && !isNaN(maxPrice)) {
      // pricePerDay <= maxPrice
      queryObj.pricePerDay = { $lte: Number(maxPrice) };
    }

    // --- C. MINIMUM RATING FILTER ---
    if (rating && Number(rating) > 0) {
      // averageRating >= rating (e.g., 4 or 3)
      queryObj.averageRating = { $gte: Number(rating) };
    }

    // 3. Filtered bikes ko Database se fetch karo
    let bikes = await Bike.find(queryObj).sort({ createdAt: -1 }).lean();
    
    const now = new Date();

    // 4. Real-time Status Check Loop (Jaisa pehle tha)
    for (let bike of bikes) {
      const activeBooking = await Booking.findOne({
        bike: bike._id,
        status: "ongoing", // Check if trip is physically active
        pickupDateTime: { $lte: now }, 
        returnDateTime: { $gte: now }  
      });

      // Agar ongoing booking mili, toh 'isCurrentlyRented' true hoga
      bike.isCurrentlyRented = !!activeBooking; 
    }

    // --- D. AVAILABILITY FILTER (Array Level Filter) ---
    // Agar user ne dropdown mein 'available' select kiya hai
    if (status === 'available') {
      bikes = bikes.filter(b => 
        !b.isCurrentlyRented && // Rent pe NAHI honi chahiye
        !b.isMaintenance &&     // Service mein NAHI honi chahiye
        b.isAvailable           // Admin ne ON rakhi ho
      );
    }

    // 5. Frontend pe data aur current filters bhejo
    res.render("home", { 
      bikes, 
      user: req.session.user || null,
      filters: req.query // Ye filter object EJS mein state maintain karega
    });
  } catch (err) {
    console.error("Home Page Error:", err);
    res.render("home", { 
      bikes: [], 
      user: req.session.user || null,
      filters: {} // Blank object in case of error
    });
  }
};

// ---------------------------------------------------------
// Bike Details: Show specific bike info, status & REVIEWS
// ---------------------------------------------------------
exports.details = async (req, res) => {
  try {
    // 🔥 NEW LOGIC: Yahan 'lean()' mat lagana kyunki Mongoose 'populate' 
    // tabhi better chalta hai jab poora object load ho.
    // Reviews ke andar jo user ID hai, use populate karke Name/Email le aao.
    const bikeData = await Bike.findById(req.params.id).populate('reviews.user');
    
    if (!bikeData) {
      return res.redirect("/");
    }

    // Bike object ko JSON (lean format) mein convert karo aage operations ke liye
    const bike = bikeData.toObject();

    const now = new Date();
    
    // Yahan bhi 'ongoing' logic apply karenge
    const activeBooking = await Booking.findOne({
      bike: bike._id,
      status: "ongoing",
      pickupDateTime: { $lte: now },
      returnDateTime: { $gte: now }
    });
    
    // Real-time Availability Flag
    bike.isCurrentlyRented = !!activeBooking;

    // Send complete 'bike' object (with populated user reviews) to frontend
    res.render("bikeDetails", { 
      bike, 
      user: req.session.user || null 
    });
  } catch (err) {
    console.error("Details Page Error:", err);
    res.redirect("/");
  }
};


exports.validateCoupon = async (req, res) => {
    try {
        const { code, totalAmount } = req.body;
        const user = req.session.user;

        // 1. Coupon dhoondo
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid Coupon Code!" });
        }

        // 2. Expiry check
        if (new Date() > coupon.expiryDate) {
            return res.json({ success: false, message: "This coupon has expired!" });
        }

        // 3. First-time user check
        if (coupon.isFirstTimeOnly && !user.isFirstTimeUser) {
            return res.json({ success: false, message: "This is for new users only!" });
        }

        // 4. Min amount check (Optionally)
        if (totalAmount < coupon.minBookingAmount) {
            return res.json({ success: false, message: `Min amount should be ₹${coupon.minBookingAmount}` });
        }

        // 5. Discount calculate karo
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
        res.json({ success: false, message: "Server Error!" });
    }
};



// bikeController.js ke andar exports.details function dhoondo
exports.details = async (req, res) => {
    try {
        const bikeId = req.params.id;
        const bike = await Bike.findById(bikeId).populate('reviews.user');
        
        if (!bike) {
            return res.redirect("/");
        }

        // --- NAYA: Dynamic Coupons Fetch Karo (Varna page crash hoga) ---
        const activeCoupons = await Coupon.find({ 
            expiryDate: { $gt: new Date() } 
        });

        // --- UPDATE: res.render mein 'coupons' pass karo ---
        res.render("bikeDetails", { 
            bike: bike, 
            coupons: activeCoupons, // Yeh line missing thi, isliye error aa rahi thi
            user: req.session.user || null 
        });

    } catch (err) {
        console.error("Bike Details Error:", err);
        res.redirect("/");
    }
};