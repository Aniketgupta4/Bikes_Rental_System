const Bike = require("../models/Bike");
const Booking = require("../models/Booking");

// Home Page: List all bikes with AUTO-availability logic
exports.home = async (req, res) => {
  try {
    // 1. Saari bikes fetch karo
    const bikes = await Bike.find().sort({ createdAt: -1 }).lean();
    
    const now = new Date();

    // 2. Real-time Status Check Loop
    for (let bike of bikes) {
      // Logic Update: Ab hum sirf 'ongoing' status check karenge
      // Kyunki jab trip start hogi, tabhi bike physically "Unavailable" hogi
      const activeBooking = await Booking.findOne({
        bike: bike._id,
        status: "ongoing", // <--- Trip start ho chuki hai
        pickupDateTime: { $lte: now }, 
        returnDateTime: { $gte: now }  
      });

      // Agar ongoing booking mili, toh 'isCurrentlyRented' true hoga
      bike.isCurrentlyRented = !!activeBooking; 
    }

    res.render("home", { 
      bikes, 
      user: req.session.user || null 
    });
  } catch (err) {
    console.error("Home Page Error:", err);
    res.render("home", { bikes: [], user: req.session.user || null });
  }
};

// Bike Details: Show specific bike info with status
exports.details = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).lean();
    
    if (!bike) {
      return res.redirect("/");
    }

    const now = new Date();
    
    // Yahan bhi 'ongoing' logic apply karenge
    const activeBooking = await Booking.findOne({
      bike: bike._id,
      status: "ongoing",
      pickupDateTime: { $lte: now },
      returnDateTime: { $gte: now }
    });
    
    bike.isCurrentlyRented = !!activeBooking;

    res.render("bikeDetails", { 
      bike, 
      user: req.session.user || null 
    });
  } catch (err) {
    console.error("Details Page Error:", err);
    res.redirect("/");
  }
};