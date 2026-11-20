// gas routes — maps urls to gas controller functions
const express = require("express");
const router = express.Router();

const {
  postGasData,
  getGasLive,
  calibrateBaseline,
  getGasLogs,
} = require("../controllers/gasController");

// POST /api/gas            -> receives gasRaw from esp32
router.post("/", postGasData);

// GET  /api/gas/live       -> returns live status, delta, baseline, warmup status
router.get("/live", getGasLive);

// POST /api/gas/calibrate  -> calibrates room air baseline
router.post("/calibrate", calibrateBaseline);

// GET  /api/gas/logs       -> returns recorded hazardous gas incidents
router.get("/logs", getGasLogs);

module.exports = router;
