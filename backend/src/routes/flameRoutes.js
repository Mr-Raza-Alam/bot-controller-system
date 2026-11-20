// flame routes — maps urls to flame controller functions
const express = require("express");
const router = express.Router();

const {
  postFlameData,
  getFlameLive,
  getFlameLogs,
  updateThreshold,
} = require("../controllers/flameController");

// POST  /api/flame            -> receives flameRaw from esp32
router.post("/", postFlameData);

// GET   /api/flame/live       -> returns live status, normalized intensity, threshold
router.get("/live", getFlameLive);

// GET   /api/flame/logs       -> returns recorded fire incidents from mongodb
router.get("/logs", getFlameLogs);

// PATCH /api/flame/threshold  -> dynamically adjusts sensitivity threshold
router.patch("/threshold", updateThreshold);

module.exports = router;
