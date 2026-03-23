const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Industry Requirement: Bike rental ke liye phone number compulsory hona chahiye
  phone: { type: String }, 
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isFirstTimeUser: { 
    type: Boolean, 
    default: true 
}
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);