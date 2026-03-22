const Booking = require("../models/Booking");
const Bike = require("../models/Bike");

// 1. User Dashboard: Show personal booking history with PAGINATION
exports.dashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // --- PAGINATION LOGIC ---
    const page = parseInt(req.query.page) || 1; // Default page 1
    const limit = 4; // Ek page par sirf 4 bookings dikhayenge (Clean UI ke liye)
    const skip = (page - 1) * limit;

    // Total bookings count (Frontend pe buttons calculate karne ke liye)
    const totalBookings = await Booking.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalBookings / limit);

    const requests = await Booking.find({ user: userId })
      .populate("bike")
      .sort({ createdAt: -1 }) // Latest booking sabse upar
      .skip(skip)
      .limit(limit);

    res.render("userDashboard", { 
      requests: requests || [], 
      user: req.session.user || null,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.render("userDashboard", { 
      requests: [], 
      user: req.session.user || null,
      currentPage: 1,
      totalPages: 1 
    });
  }
};

// 2. Industry Level Booking Logic (Date + Time)
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
      return res.redirect(`/bike/${bike._id}?error=invalid_dates`);
    }

    // 3. Exact Duration Calculation
    const diffInMs = Math.abs(end - start);
    
    // Industry Standard: Math.ceil taaki partial days full day count hon
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); 

    // 4. Final Price Calculation
    const totalPrice = diffInDays * bike.pricePerDay;

    // 5. Save to Database
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