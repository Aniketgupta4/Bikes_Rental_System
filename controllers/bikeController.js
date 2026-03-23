const Bike = require("../models/Bike");
const Booking = require("../models/Booking");

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