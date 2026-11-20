// sensor routes — maps urls to sensor controller functions

const express = require("express");
const router = express.Router();

const { postSensorData, getLatestSensor, getSensorHistory } = require("../controllers/sensorController");

router.post("/", postSensorData);         // esp32 pushes sensor readings
router.get("/", getLatestSensor);         // dashboard gets latest reading
router.get("/history", getSensorHistory); // dashboard gets last N readings

module.exports = router;
