// handles all business logic for sensor data (flame, gas, health, obstacle)
const Sensor = require("../models/Sensor");
const { getBotStatus } = require("./commandController");

// esp32 pushes a new batch of sensor readings
// POST /api/sensor
const postSensorData = async (req, res) => {
  try {
    const { flame, gas, health, obstacle } = req.body;

    const sensorReading = await Sensor.create({ flame, gas, health, obstacle });

    res.status(201).json({
      success: true,
      message: "Sensor data saved successfully.",
      data: sensorReading,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save sensor data.",
      error: error.message,
    });
  }
};

// dashboard fetches the most recent sensor reading
// GET /api/sensor
const getLatestSensor = async (req, res) => {
  try {
    const latest = await Sensor.findOne().sort({ createdAt: -1 });

    if (!latest) {
      return res.status(404).json({
        success: false,
        message: "No sensor data found. Bot may not have posted yet.",
      });
    }

    res.status(200).json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sensor data.",
      error: error.message,
    });
  }
};

// dashboard fetches last N sensor records
// GET /api/sensor/history?limit=10
const getSensorHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await Sensor.find().sort({ createdAt: -1 }).limit(limit);

    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sensor history.",
      error: error.message,
    });
  }
};

module.exports = { postSensorData, getLatestSensor, getSensorHistory };
