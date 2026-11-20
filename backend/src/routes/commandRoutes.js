// command routes — maps urls to command controller functions
const express = require("express");
const router = express.Router();

const {
  postCommand,
  getPendingCommand,
  markExecuted,
  getBotStatus,
  getCommandHistory,
} = require("../controllers/commandController");

router.post("/", postCommand);                  // dashboard sends a command
router.get("/", getPendingCommand);             // esp32 fetches pending command & updates heartbeat
router.get("/bot-status", getBotStatus);        // dashboard checks if bot hardware is online
router.patch("/:id/executed", markExecuted);   // esp32 marks command as done
router.get("/history", getCommandHistory);      // dashboard gets command log

module.exports = router;
