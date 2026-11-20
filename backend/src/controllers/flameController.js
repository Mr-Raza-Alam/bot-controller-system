// flame controller — handles normalization, dynamic thresholding, and incident logging
const FlameIncident = require("../models/FlameIncident");

// in-memory live state (fast, avoids constant database polling)
let liveState = {
  flameRaw: 4095,
  flameIntensity: 0,
  isFireDetected: false,
  lastUpdated: null,
};

// dynamic threshold percentage (0-100%) — default is 60%
let activeThreshold = 60;

// incident debouncing timestamp to avoid spamming records for a continuous flame
let lastIncidentLoggedAt = 0;
const INCIDENT_COOLDOWN_MS = 6000;

// receive raw flame reading from esp32
// POST /api/flame
const postFlameData = async (req, res) => {
  try {
    const raw = Number(req.body.flameRaw);

    if (isNaN(raw)) {
      return res.status(400).json({
        success: false,
        message: "Invalid flameRaw value. Must be a number (0-4095).",
      });
    }

    // clamp reading between 0 and 4095
    const clampedRaw = Math.max(0, Math.min(4095, raw));

    // normalize: 4095 (dark/safe) -> 0%, 0 (direct flame) -> 100%
    const intensity = Math.round(((4095 - clampedRaw) / 4095) * 100);
    const isFire = intensity >= activeThreshold;

    liveState = {
      flameRaw: clampedRaw,
      flameIntensity: intensity,
      isFireDetected: isFire,
      lastUpdated: new Date().toISOString(),
    };

    // smart incident logging: log to mongodb only when fire triggers
    const now = Date.now();
    if (isFire && now - lastIncidentLoggedAt > INCIDENT_COOLDOWN_MS) {
      lastIncidentLoggedAt = now;
      await FlameIncident.create({
        peakIntensity: intensity,
        flameRaw: clampedRaw,
        thresholdAtTrigger: activeThreshold,
        status: "FIRE DETECTED",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        flameRaw: clampedRaw,
        flameIntensity: intensity,
        isFireDetected: isFire,
        threshold: activeThreshold,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process flame data.",
      error: error.message,
    });
  }
};

// get latest live flame status for virtual controller
// GET /api/flame/live
const getFlameLive = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      ...liveState,
      threshold: activeThreshold,
    },
  });
};

// get recent fire incidents for judges
// GET /api/flame/logs
const getFlameLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const incidents = await FlameIncident.find()
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
      message: "Failed to fetch flame incidents.",
      error: error.message,
    });
  }
};

// dynamically adjust threshold from the web dashboard
// PATCH /api/flame/threshold
const updateThreshold = (req, res) => {
  try {
    const newThreshold = Number(req.body.threshold);

    if (isNaN(newThreshold) || newThreshold < 5 || newThreshold > 95) {
      return res.status(400).json({
        success: false,
        message: "Threshold must be a number between 5 and 95.",
      });
    }

    activeThreshold = Math.round(newThreshold);

    // re-evaluate current live state against new threshold
    liveState.isFireDetected = liveState.flameIntensity >= activeThreshold;

    res.status(200).json({
      success: true,
      message: `Detection threshold set to ${activeThreshold}%`,
      data: { threshold: activeThreshold },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update threshold.",
      error: error.message,
    });
  }
};

module.exports = {
  postFlameData,
  getFlameLive,
  getFlameLogs,
  updateThreshold,
};
