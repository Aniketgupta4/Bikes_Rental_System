const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bike: { type: mongoose.Schema.Types.ObjectId, ref: "Bike", required: true },
  
  // Industry Level: Storing exact Date + Time
  pickupDateTime: { type: Date, required: true }, 
  returnDateTime: { type: Date, required: true },
  
  totalPrice: { type: Number, required: true },
  status: { 
    type: String, 
    // 👇 YAHAN FIX KIYA HAI: 'ongoing' aur 'completed' add kar diya hai
    enum: ["pending", "approved", "ongoing", "completed", "rejected", 'cancelled'], 
    default: "pending" 
  },
  isReviewed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);