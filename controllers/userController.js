const Booking = require("../models/Booking");
const Bike = require("../models/Bike");
const Coupon = require("../models/Coupon");
const User = require("../models/User");

// 1. User Dashboard (PAGINATION ke sath)
exports.dashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;
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
    res.render("userDashboard", { requests: [], user: req.session.user || null, currentPage: 1, totalPages: 1 });
  }
};

// 2. Updated Booking Logic: AUTOMATIC WELCOME DISCOUNT + MANUAL COUPON
exports.bookBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.redirect("/");

    const { pickupDateTime, returnDateTime, appliedCoupon } = req.body;
    const start = new Date(pickupDateTime);
    const end = new Date(returnDateTime);

    if (end <= start) {
      return res.redirect(`/bike/${bike._id}?error=invalid_dates`);
    }

    // A. Base Price Calculation
    const diffInMs = Math.abs(end - start);
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); 
    let baseTotal = diffInDays * bike.pricePerDay;
    
    let totalDiscount = 0;

    // B. Fetch Latest User Data (Flag check karne ke liye)
    const user = await User.findById(req.session.user._id);

    // C. Logic 1: AUTOMATIC ₹100 WELCOME DISCOUNT
    if (user.isFirstTimeUser) {
      totalDiscount += 100;
    }

    // D. Logic 2: MANUAL COUPON DISCOUNT (Agar user ne dala ho)
    if (appliedCoupon && appliedCoupon.trim() !== "") {
      const coupon = await Coupon.findOne({ 
        code: appliedCoupon.toUpperCase().trim(), 
        isActive: true 
      });

      if (coupon) {
        // Check expiry
        if (new Date() <= coupon.expiryDate) {
           let manualDisc = 0;
           if (coupon.discountType === "percentage") {
             manualDisc = (baseTotal * coupon.discountValue) / 100;
           } else {
             manualDisc = coupon.discountValue;
           }
           totalDiscount += manualDisc;
        }
      }
    }

    // E. Final Price calculation
    const finalPrice = Math.max(0, baseTotal - totalDiscount);

    // F. Create Booking
    await Booking.create({
      user: user._id,
      bike: bike._id,
      pickupDateTime: start,
      returnDateTime: end,
      totalPrice: finalPrice
    });

    // G. UPDATE USER FLAG: Discount use ho gaya, ab 'false' kar do
    if (user.isFirstTimeUser) {
      await User.findByIdAndUpdate(user._id, { isFirstTimeUser: false });
      req.session.user.isFirstTimeUser = false; // Update session
    }

    res.redirect("/user/dashboard");
  } catch (err) {
    console.error("Booking Error:", err);
    res.redirect("/");
  }
};

// 3. Cancellation Logic
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.user.toString() !== req.session.user._id.toString()) {
      return res.redirect("/user/dashboard");
    }
    if (booking.status === "pending" || booking.status === "approved") {
      booking.status = "cancelled";
      await booking.save();
    }
    res.redirect("/user/dashboard");
  } catch (err) {
    res.redirect("/user/dashboard");
  }
};

// 4. Review Logic
exports.submitReview = async (req, res) => {
    try {
        const { rating, comment, bikeId } = req.body;
        const bookingId = req.params.bookingId;
        const userId = req.session.user._id;

        const booking = await Booking.findOne({ _id: bookingId, user: userId, status: 'completed' });
        if (!booking || booking.isReviewed) return res.redirect('/user/dashboard');

        const bike = await Bike.findById(bikeId);
        bike.reviews.push({ user: userId, rating: Number(rating), comment });

        const totalReviews = bike.reviews.length;
        const sumRatings = bike.reviews.reduce((sum, rev) => sum + rev.rating, 0);
        bike.averageRating = (sumRatings / totalReviews).toFixed(1);

        await bike.save();
        booking.isReviewed = true;
        await booking.save();

        res.redirect('/user/dashboard');
    } catch (err) {
        res.redirect('/user/dashboard');
    }
};


