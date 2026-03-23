const Booking = require("../models/Booking");
const Bike = require("../models/Bike");

// 1. User Dashboard: Show personal booking history with PAGINATION
exports.dashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // --- PAGINATION LOGIC ---
    const page = parseInt(req.query.page) || 1; 
    const limit = 4; 
    const skip = (page - 1) * limit;

    const totalBookings = await Booking.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalBookings / limit);

    const requests = await Booking.find({ user: userId })
      .populate("bike")
      .sort({ createdAt: -1 }) 
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

// 2. Industry Level Booking Logic
exports.bookBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.redirect("/");

    const { pickupDateTime, returnDateTime } = req.body;
    const start = new Date(pickupDateTime);
    const end = new Date(returnDateTime);

    if (end <= start) {
      return res.redirect(`/bike/${bike._id}?error=invalid_dates`);
    }

    const diffInMs = Math.abs(end - start);
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); 
    const totalPrice = diffInDays * bike.pricePerDay;

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

// 3. NAYA: User Side Cancellation Logic
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    // Security: Check if booking exists and belongs to the logged-in user
    if (!booking || booking.user.toString() !== req.session.user._id.toString()) {
      return res.redirect("/user/dashboard");
    }

    // Logic: Only "pending" or "approved" rides can be cancelled. 
    // "ongoing" rides can't be cancelled by user for security reasons.
    if (booking.status === "pending" || booking.status === "approved") {
      booking.status = "cancelled";
      await booking.save();
    }

    res.redirect("/user/dashboard");
  } catch (err) {
    console.error("Cancel Error:", err);
    res.redirect("/user/dashboard");
  }
};



exports.submitReview = async (req, res) => {
    try {
        const { rating, comment, bikeId } = req.body;
        const bookingId = req.params.bookingId;
        const userId = req.session.user._id;

        // 1. Check if booking belongs to user and is completed
        const booking = await Booking.findOne({ _id: bookingId, user: userId, status: 'completed' });
        
        if (!booking) {
            return res.status(400).send("Sirf completed rides par review diya ja sakta hai.");
        }
        if (booking.isReviewed) {
            return res.status(400).send("Aap pehle hi is ride ka review de chuke hain.");
        }

        // 2. Bike dhundo aur review push karo
        const bike = await Bike.findById(bikeId);
        bike.reviews.push({ user: userId, rating: Number(rating), comment });

        // 3. Nayi Average Rating Calculate karo
        const totalReviews = bike.reviews.length;
        const sumRatings = bike.reviews.reduce((sum, rev) => sum + rev.rating, 0);
        bike.averageRating = (sumRatings / totalReviews).toFixed(1);

        await bike.save();

        // 4. Booking ko 'Reviewed' mark kar do
        booking.isReviewed = true;
        await booking.save();

        res.redirect('/user/dashboard');
    } catch (err) {
        console.error("Review Error:", err);
        res.redirect('/user/dashboard');
    }
};