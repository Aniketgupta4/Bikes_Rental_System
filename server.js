const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const connectDB = require("./config/db");
connectDB();

const app = express();

// middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use(session({ secret: process.env.SESSION_SECRET || "secret123", resave: false, saveUninitialized: false }));

// set EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/uploads", express.static("uploads"));


// make user available in views as 'user'
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// routes
app.use("/", require("./routes/bikeRoutes"));     // home and bike details
app.use("/", require("./routes/authRoutes"));     // login/signup/logout
app.use("/", require("./routes/userRoutes"));     // user actions
app.use("/", require("./routes/adminRoutes"));    // admin actions

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
