const Booking = require("../models/Booking");
const Bike = require("../models/Bike");
const Coupon = require("../models/Coupon");
const User = require("../models/User");

// Naye Imports Payment ke liye (Socket.io HATA DIYA HAI)
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Razorpay Instance Setup
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
      totalPages: totalPages,
      successMsg: req.query.booking === 'success' ? "Ride Reserved & Paid Successfully!" : null
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.render("userDashboard", { requests: [], user: req.session.user || null, currentPage: 1, totalPages: 1 });
  }
};

// 2. CREATE ORDER (Razorpay Order Generate karne ke liye)
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { bikeId, pickupDateTime, returnDateTime, appliedCoupon } = req.body;
        const bike = await Bike.findById(bikeId);
        const user = await User.findById(req.session.user._id);

        const start = new Date(pickupDateTime);
        const end = new Date(returnDateTime);
        const diffInMs = Math.abs(end - start);
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); 
        let baseTotal = diffInDays * bike.pricePerDay;
        
        let totalDiscount = 0;

        // Welcome Discount
        if (user.isFirstTimeUser) {
            totalDiscount += 100;
        }

        // Manual Coupon Discount
        if (appliedCoupon && appliedCoupon.trim() !== "") {
            const coupon = await Coupon.findOne({ code: appliedCoupon.toUpperCase().trim(), isActive: true });
            if (coupon && new Date() <= coupon.expiryDate) {
                if (!coupon.isFirstTimeOnly || user.isFirstTimeUser) {
                    let manualDisc = coupon.discountType === "percentage" ? (baseTotal * coupon.discountValue) / 100 : coupon.discountValue;
                    totalDiscount += manualDisc;
                }
            }
        }

        const finalPrice = Math.max(0, baseTotal - totalDiscount);

        // Razorpay Order Creation
        const options = {
            amount: finalPrice * 100, // Paise mein
            currency: "INR",
            receipt: "rcpt_" + Date.now()
        };

        const order = await razorpayInstance.orders.create(options);
        
        res.json({ success: true, order, finalPrice });
    } catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({ success: false, message: "Could not create order" });
    }
};

// 3. VERIFY PAYMENT (Payment hone ke baad Database mein save karne ke liye)
exports.verifyRazorpayPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            bikeId, pickupDateTime, returnDateTime, finalPrice 
        } = req.body;

        // Security: Signature Verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment success! Save to DB
            const user = await User.findById(req.session.user._id);

            await Booking.create({
                user: user._id,
                bike: bikeId,
                pickupDateTime: new Date(pickupDateTime),
                returnDateTime: new Date(returnDateTime),
                totalPrice: finalPrice,
                paymentStatus: 'paid',
                transactionId: razorpay_payment_id,
                paymentMethod: 'Razorpay UPI/Card',
                status: 'pending' 
            });

            // Update user flag
            if (user.isFirstTimeUser) {
                await User.findByIdAndUpdate(user._id, { isFirstTimeUser: false });
                req.session.user.isFirstTimeUser = false;
            }

            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "Invalid Signature" });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


// 3.5 PAY AT PICKUP LOGIC (Bina Razorpay ke direct book)
exports.bookPayAtPickup = async (req, res) => {
    try {
        const { bikeId, pickupDateTime, returnDateTime, appliedCoupon } = req.body;
        const bike = await Bike.findById(bikeId);
        const user = await User.findById(req.session.user._id);

        const start = new Date(pickupDateTime);
        const end = new Date(returnDateTime);
        const diffInMs = Math.abs(end - start);
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); 
        let baseTotal = diffInDays * bike.pricePerDay;
        
        let totalDiscount = 0;

        if (user.isFirstTimeUser) totalDiscount += 100;

        if (appliedCoupon && appliedCoupon.trim() !== "") {
            const coupon = await Coupon.findOne({ code: appliedCoupon.toUpperCase().trim(), isActive: true });
            if (coupon && new Date() <= coupon.expiryDate) {
                if (!coupon.isFirstTimeOnly || user.isFirstTimeUser) {
                    let manualDisc = coupon.discountType === "percentage" ? (baseTotal * coupon.discountValue) / 100 : coupon.discountValue;
                    totalDiscount += manualDisc;
                }
            }
        }

        const finalPrice = Math.max(0, baseTotal - totalDiscount);

        // Direct DB mein save with 'Pay at Pickup' tag
        await Booking.create({
            user: user._id,
            bike: bikeId,
            pickupDateTime: start,
            returnDateTime: end,
            totalPrice: finalPrice,
            paymentStatus: 'pending', // Paide abhi nahi mile
            transactionId: 'PAY_AT_PICKUP',
            paymentMethod: 'Cash/Counter UPI',
            status: 'pending' 
        });

        // Update user flag
        if (user.isFirstTimeUser) {
            await User.findByIdAndUpdate(user._id, { isFirstTimeUser: false });
            req.session.user.isFirstTimeUser = false;
        }

        res.json({ success: true, message: "Booking Confirmed! Pay at Counter." });
    } catch (error) {
        console.error("Pay at Pickup Error:", error);
        res.status(500).json({ success: false, message: "Could not process booking" });
    }
};



// 4. Cancellation Logic
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

// 5. Review Logic
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