const mongoose = require("mongoose");

const BikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  pricePerDay: { type: Number, required: true },
  // Industry Tip: Future mein pricePerHour bhi add kar sakte ho short rentals ke liye
  image: { type: String }, 
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true }); // timestamps adds 'createdAt' and 'updatedAt' automatically

module.exports = mongoose.model("Bike", BikeSchema);