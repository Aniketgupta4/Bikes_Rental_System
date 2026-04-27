const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bike: { type: mongoose.Schema.Types.ObjectId, ref: "Bike", required: true },
  
  // Industry Level: Storing exact Date + Time
  pickupDateTime: { type: Date, required: true }, 
  returnDateTime: { type: Date, required: true },
  
  totalPrice: { type: Number, required: true },

  // 👇 NEW: Razorpay Payment Tracking Fields
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending' 
  },
  transactionId: { 
    type: String 
  }, // Yahan 'razorpay_payment_id' save hoga
  paymentMethod: { 
    type: String,
    default: 'Razorpay'
  },

  status: { 
    type: String, 
    enum: ["pending", "approved", "ongoing", "completed", "rejected", 'cancelled'], 
    default: "pending" 
  },
  isReviewed: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);