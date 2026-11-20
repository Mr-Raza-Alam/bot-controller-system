const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("../src/config/db");
const sensorRoutes = require("../src/routes/sensorRoutes");
const commandRoutes = require("../src/routes/commandRoutes");
const flameRoutes = require("../src/routes/flameRoutes");
const gasRoutes = require("../src/routes/gasRoutes");
const vitalsRoutes = require("../src/routes/vitalsRoutes");
const navigationRoutes = require("../src/routes/navigationRoutes");
const errorHandler = require("../src/middleware/errorHandler");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ensure MongoDB Atlas connection is established before route handlers run
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn("Serverless DB connection non-blocking notice:", err.message);
  }
  next();
});

// health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Multi-Purpose Bot Backend is online",
    version: "1.0.0",
  });
});

app.use("/api/sensor", sensorRoutes);
app.use("/api/command", commandRoutes);
app.use("/api/flame", flameRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/navigation", navigationRoutes);

app.use(errorHandler);

module.exports = app;
