// gas controller — handles baseline calibration, delta calculations, and incident logging
const GasIncident = require("../models/GasIncident");

// server startup timestamp to compute heating coil warm-up period (30 seconds)
const serverStartTime = Date.now();
const WARMUP_DURATION_MS = 30000;

// room baseline ADC value (calibrated for ambient room air)
let roomBaseline = 600;

// in-memory live state for sub-second dashboard updates
let liveGasState = {
  gasRaw: 600,
  gasDelta: 0,
  status: "SAFE",
  baseline: 600,
  lastUpdated: null,
};

// debouncing to avoid spamming incident records for continuous leaks
let lastIncidentLoggedAt = 0;
const INCIDENT_COOLDOWN_MS = 6000;

// receive raw gas reading from esp32
// POST /api/gas
const postGasData = async (req, res) => {
  try {
    const raw = Number(req.body.gasRaw);

    if (isNaN(raw)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gasRaw value. Must be a number (0-4095).",
      });
    }

    const clampedRaw = Math.max(0, Math.min(4095, raw));

    // compute relative spike above calibrated room baseline
    const delta = Math.max(0, clampedRaw - roomBaseline);

    // 3-tier classification
    let status = "SAFE";
    if (delta > 500) {
      status = "HAZARDOUS";
    } else if (delta >= 250) {
      status = "MODERATE";
    }

    const now = Date.now();
    const isWarmingUp = now - serverStartTime < WARMUP_DURATION_MS;

    liveGasState = {
      gasRaw: clampedRaw,
      gasDelta: delta,
      status,
      baseline: roomBaseline,
      lastUpdated: new Date().toISOString(),
      isWarmingUp,
    };

    // smart incident logging: record only HAZARDOUS events in mongodb
    if (status === "HAZARDOUS" && now - lastIncidentLoggedAt > INCIDENT_COOLDOWN_MS) {
      lastIncidentLoggedAt = now;
      await GasIncident.create({
        peakRaw: clampedRaw,
        gasDelta: delta,
        baselineAtTrigger: roomBaseline,
        status: "HAZARDOUS",
      });
    }

    res.status(200).json({
      success: true,
      data: liveGasState,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process gas reading.",
      error: error.message,
    });
  }
};

// get latest air safety status for virtual controller
// GET /api/gas/live
const getGasLive = (req, res) => {
  const now = Date.now();
  const warmupRemaining = Math.max(0, Math.round((WARMUP_DURATION_MS - (now - serverStartTime)) / 1000));

  res.status(200).json({
    success: true,
    data: {
      ...liveGasState,
      baseline: roomBaseline,
      warmupRemaining,
      isWarmingUp: warmupRemaining > 0,
    },
  });
};

// calibrate clean air baseline from current room readings
// POST /api/gas/calibrate
const calibrateBaseline = (req, res) => {
  try {
    // calibrate to incoming reading or current live reading
    const targetValue = req.body.baseline !== undefined
      ? Number(req.body.baseline)
      : liveGasState.gasRaw;

    if (isNaN(targetValue) || targetValue < 50 || targetValue > 3500) {
      return res.status(400).json({
        success: false,
        message: "Invalid baseline value. Must be between 50 and 3500.",
      });
    }

    roomBaseline = Math.round(targetValue);
    liveGasState.baseline = roomBaseline;
    liveGasState.gasDelta = Math.max(0, liveGasState.gasRaw - roomBaseline);

    if (liveGasState.gasDelta > 500) {
      liveGasState.status = "HAZARDOUS";
    } else if (liveGasState.gasDelta >= 250) {
      liveGasState.status = "MODERATE";
    } else {
      liveGasState.status = "SAFE";
    }

    res.status(200).json({
      success: true,
      message: `Room baseline calibrated to ${roomBaseline} ADC`,
      data: { baseline: roomBaseline },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to calibrate baseline.",
      error: error.message,
    });
  }
};

// get recorded hazardous gas incidents from mongodb
// GET /api/gas/logs
const getGasLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const incidents = await GasIncident.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch gas incidents.",
      error: error.message,
    });
  }
};

module.exports = {
  postGasData,
  getGasLive,
  calibrateBaseline,
  getGasLogs,
};
