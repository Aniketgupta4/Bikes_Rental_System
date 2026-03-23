const mongoose = require("mongoose");

const BikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  pricePerDay: { type: Number, required: true },
  // Industry Tip: Future mein pricePerHour bhi add kar sakte ho short rentals ke liye
  image: { type: String }, 
  isAvailable: { type: Boolean, default: true },
  isMaintenance: { type: Boolean, default: false },
  
  averageRating: { type: Number, default: 0 },
    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            rating: { type: Number, required: true, min: 1, max: 5 },
            comment: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ]
    
}, { timestamps: true }); // timestamps adds 'createdAt' and 'updatedAt' automatically

module.exports = mongoose.model("Bike", BikeSchema);