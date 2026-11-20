// vitals routes — maps urls to vitals controller functions
const express = require("express");
const router = express.Router();

const {
  postVitalsData,
  getVitalsLive,
  saveCheckup,
  getVitalsLogs,
} = require("../controllers/vitalsController");

// POST /api/vitals        -> receives readings from esp32
router.post("/", postVitalsData);

// GET  /api/vitals/live   -> returns live heart rate and temperature
router.get("/live", getVitalsLive);

// POST /api/vitals/save   -> persists a clean checkup in mongodb
router.post("/save", saveCheckup);

// GET  /api/vitals/logs   -> returns past persistent triage checkups
router.get("/logs", getVitalsLogs);

module.exports = router;
