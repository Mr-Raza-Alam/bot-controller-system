// command controller — handles navigation commands and bot heartbeat tracking
const Command = require("../models/Command");

// in-memory tracking of the bot's last check-in (heartbeat)
let botLastSeen = null;

// dashboard sends a new command
// POST /api/command
const postCommand = async (req, res) => {
  try {
    const { command, source } = req.body;

    if (!command) {
      return res.status(400).json({ success: false, message: "Command field is required." });
    }

    const newCommand = await Command.create({
      command: command.toUpperCase(),
      source: source || "button",
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: `Command '${newCommand.command}' queued successfully.`,
      data: newCommand,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to post command.",
      error: error.message,
    });
  }
};

// esp32 bot fetches latest pending command (this acts as the bot's heartbeat ping!)
// GET /api/command
const getPendingCommand = async (req, res) => {
  try {
    // update bot heartbeat timestamp
    botLastSeen = Date.now();

    const pending = await Command.findOne({ status: "pending" }).sort({ createdAt: -1 });

    if (!pending) {
      return res.status(200).json({ success: true, message: "No pending commands.", data: null });
    }

    res.status(200).json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending command.",
      error: error.message,
    });
  }
};

// esp32 marks command as executed
// PATCH /api/command/:id/executed
const markExecuted = async (req, res) => {
  try {
    botLastSeen = Date.now();

    const updated = await Command.findByIdAndUpdate(
      req.params.id,
      { status: "executed" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Command not found." });
    }

    res.status(200).json({
      success: true,
      message: `Command '${updated.command}' marked as executed.`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update command status.",
      error: error.message,
    });
  }
};

// dashboard checks if the bot hardware is currently online
// GET /api/command/bot-status
const getBotStatus = async (req, res) => {
  const now = Date.now();
  const timeoutMs = 12000; // considered offline if no ping in last 12 seconds
  const isOnline = botLastSeen !== null && now - botLastSeen < timeoutMs;

  res.status(200).json({
    success: true,
    data: {
      isOnline,
      lastSeen: botLastSeen ? new Date(botLastSeen).toISOString() : null,
      secondsAgo: botLastSeen ? Math.round((now - botLastSeen) / 1000) : null,
    },
  });
};

// dashboard fetches last N commands history
// GET /api/command/history?limit=10
const getCommandHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await Command.find().sort({ createdAt: -1 }).limit(limit);

    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve command history.",
      error: error.message,
    });
  }
};

module.exports = {
  postCommand,
  getPendingCommand,
  markExecuted,
  getBotStatus,
  getCommandHistory,
};
