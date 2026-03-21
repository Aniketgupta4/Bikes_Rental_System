const Booking = require("../models/Booking");
const Bike = require("../models/Bike");

// User Dashboard: Show personal booking history
exports.dashboard = async (req, res) => {
  try {
    const requests = await Booking.find({ user: req.session.user._id })
      .populate("bike")
      .sort({ createdAt: -1 }); // Latest booking upar dikhegi

    res.render("userDashboard", { 
      requests, 
      user: req.session.user || null 
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.render("userDashboard", { requests: [], user: req.session.user || null });
  }
};

// Industry Level Booking Logic (Date + Time)
exports.bookBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.redirect("/");

    // 1. Get Date-Time from Frontend
    const { pickupDateTime, returnDateTime } = req.body;
    
    const start = new Date(pickupDateTime);
    const end = new Date(returnDateTime);

    // 2. Logic: Return time pickup se pehle nahi ho sakta
    if (end <= start) {
      // Ideally, yahan ek error message pass karna chahiye details page par
      return res.redirect(`/bike/${bike._id}?error=invalid_dates`);
    }

    // 3. Exact Duration Calculation
    const diffInMs = Math.abs(end - start);
    
    // Industry Standard: Agar 24 ghante se 1 second bhi upar hai, toh next day count hota hai (Math.ceil)
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); 

    // 4. Final Price Calculation
    const totalPrice = diffInDays * bike.pricePerDay;

    // 5. Save to Database using updated Schema
    await Booking.create({
      user: req.session.user._id,
      bike: bike._id,
      pickupDateTime: start,
      returnDateTime: end,
      totalPrice
    });

    res.redirect("/user/dashboard");
  } catch (err) {
    console.error("Booking Error:", err);
    res.redirect("/");
  }
};

