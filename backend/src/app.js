const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = require("./config/db");
const sensorRoutes = require("./routes/sensorRoutes");
const commandRoutes = require("./routes/commandRoutes");
const flameRoutes = require("./routes/flameRoutes");
const gasRoutes = require("./routes/gasRoutes");
const vitalsRoutes = require("./routes/vitalsRoutes");
const navigationRoutes = require("./routes/navigationRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Multi-Purpose Bot Backend is online",
    version: "1.0.0",
    endpoints: {
      sensor: "/api/sensor",
      command: "/api/command",
      flame: "/api/flame",
      gas: "/api/gas",
      vitals: "/api/vitals",
      navigation: "/api/navigation",
    },
  });
});

app.use("/api/sensor", sensorRoutes);
app.use("/api/command", commandRoutes);
app.use("/api/flame", flameRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/navigation", navigationRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
