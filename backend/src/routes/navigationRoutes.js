// navigation routes — maps urls to navigation controller functions
const express = require("express");
const router = express.Router();

const {
  postNavCommand,
  getNavCommand,
  postNavStatus,
  getNavStatus,
  clearNavHistory,
} = require("../controllers/navigationController");

// POST /api/navigation/command  -> called by react ui (d-pad or voice)
router.post("/command", postNavCommand);

// GET  /api/navigation/command  -> polled by esp32 every 300-500ms
router.get("/command", getNavCommand);

// POST /api/navigation/status   -> pushed by esp32 to report distance & obstacle override
router.post("/status", postNavStatus);

// GET  /api/navigation/status   -> polled by react ui to render radar & live feedback
router.get("/status", getNavStatus);

// DELETE /api/navigation/history -> wipe command audit trail
router.delete("/history", clearNavHistory);
router.post("/clear-history", clearNavHistory);

module.exports = router;
