const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.showLogin = (req, res) => res.render("login", { message: null });
exports.showSignup = (req, res) => res.render("signup", { message: null });

// USER Signup (Updated with Phone field)
exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body; // Added phone
    
    // Quick Check: Email already exist toh nahi?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signup", { message: "Email already exists!" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone, // Professional tracking ke liye zaroori hai
      password: hashed,
      role: "user" 
    });

    // Session creation
    req.session.user = { 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    };

    return res.redirect("/user/dashboard");
  } catch (err) {
    console.error("Signup Error:", err);
    return res.render("signup", { message: "Error during signup. Try again." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.render("login", { message: "Invalid email/password" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.render("login", { message: "Invalid email/password" });

    // Storing essential data in session
    req.session.user = { 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    };

    return res.redirect(user.role === "admin" ? "/admin/dashboard" : "/user/dashboard");

  } catch (err) {
    console.error("Login Error:", err);
    return res.render("login", { message: "Login error" });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect("/"));
};