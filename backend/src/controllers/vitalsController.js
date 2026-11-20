// vitals controller — handles independent heart rate, temperature screening, and clean triage saves
const VitalRecord = require("../models/VitalRecord");

// in-memory live state
let liveVitals = {
  heartRate: 0,
  bodyTempC: 36.6,
  bodyTempF: 97.9,
  fingerDetected: false,
  heartStatus: "NO_PULSE",
  tempStatus: "NORMAL",
  lastUpdated: null,
};

// helper to classify heart rhythm
const evaluateHeartStatus = (bpm, fingerDetected) => {
  if (!fingerDetected || !bpm || bpm === 0) return "NO_PULSE";
  if (bpm > 125) return "CRITICAL";
  if (bpm >= 101) return "ELEVATED";
  return "NORMAL";
};

// helper to classify body temperature
const evaluateTempStatus = (tempC) => {
  if (!tempC || tempC === 0) return "NORMAL";
  if (tempC > 38.5) return "HIGH_FEVER";
  if (tempC >= 37.3) return "MILD_FEVER";
  if (tempC < 36.0) return "BELOW_AVG";
  return "NORMAL";
};

// receive vitals reading from esp32
// POST /api/vitals
const postVitalsData = (req, res) => {
  try {
    const { heartRate, bodyTempC, fingerDetected } = req.body;

    // parse readings independently so temp works even if pulse is null
    const parsedBpm = heartRate !== undefined ? Number(heartRate) : liveVitals.heartRate;
    const parsedTempC = bodyTempC !== undefined ? Number(bodyTempC) : liveVitals.bodyTempC;
    const isFingerOn = fingerDetected !== undefined ? Boolean(fingerDetected) : liveVitals.fingerDetected;

    const tempF = parsedTempC ? Number(((parsedTempC * 9) / 5 + 32).toFixed(1)) : null;

    liveVitals = {
      heartRate: parsedBpm,
      bodyTempC: parsedTempC,
      bodyTempF: tempF,
      fingerDetected: isFingerOn,
      heartStatus: evaluateHeartStatus(parsedBpm, isFingerOn),
      tempStatus: evaluateTempStatus(parsedTempC),
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: liveVitals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process vitals data.",
      error: error.message,
    });
  }
};

// get current live vitals reading
// GET /api/vitals/live
const getVitalsLive = (req, res) => {
  res.status(200).json({
    success: true,
    data: liveVitals,
  });
};

// save a clean medical checkup record to mongodb
// POST /api/vitals/save
const saveCheckup = async (req, res) => {
  try {
    const { checkType } = req.body;
    const type = checkType || "BOTH";

    let recordData = {
      checkType: type,
      fingerDetected: liveVitals.fingerDetected,
    };

    // isolate fields based on selected mode to avoid polluting db with 0 values
    if (type === "HEART_RATE") {
      recordData.heartRate = liveVitals.heartRate;
      recordData.heartStatus = liveVitals.heartStatus;
      recordData.bodyTempC = null;
      recordData.bodyTempF = null;
    } else if (type === "BODY_TEMP") {
      recordData.bodyTempC = liveVitals.bodyTempC;
      recordData.bodyTempF = liveVitals.bodyTempF;
      recordData.tempStatus = liveVitals.tempStatus;
      recordData.heartRate = null;
    } else {
      // BOTH
      recordData.heartRate = liveVitals.heartRate;
      recordData.heartStatus = liveVitals.heartStatus;
      recordData.bodyTempC = liveVitals.bodyTempC;
      recordData.bodyTempF = liveVitals.bodyTempF;
      recordData.tempStatus = liveVitals.tempStatus;
    }

    const saved = await VitalRecord.create(recordData);

    res.status(201).json({
      success: true,
      message: `Checkup saved successfully (${type} mode)`,
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save checkup record.",
      error: error.message,
    });
  }
};

// get recent persistent checkups from mongodb
// GET /api/vitals/logs
const getVitalsLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const records = await VitalRecord.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve checkup records.",
      error: error.message,
    });
  }
};

module.exports = {
  postVitalsData,
  getVitalsLive,
  saveCheckup,
  getVitalsLogs,
};
