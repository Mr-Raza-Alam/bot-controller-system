// navigation controller — persistent cloud state for decoupled bot control & obstacle telemetry
const NavigationState = require("../models/NavigationState");
const NavAuditLog = require("../models/NavAuditLog");

// fallback default state if database is initializing
const DEFAULT_NAV_STATE = {
  mode: "MANUAL",
  action: "STOP",
  source: "MANUAL",
  distanceCm: 999,
  obstacleDetected: false,
  executedAction: "STOP",
};

// update active navigation instruction from react controller (d-pad or voice)
// POST /api/navigation/command
const postNavCommand = async (req, res) => {
  try {
    const { mode, action, source } = req.body;

    const targetAction = action ? action.toUpperCase() : "STOP";
    let targetMode = mode ? mode.toUpperCase() : "MANUAL";
    const targetSource = source ? source.toUpperCase() : "MANUAL";

    // emergency stop priority: any stop command immediately forces mode to manual
    if (targetAction === "STOP") {
      targetMode = "MANUAL";
    }

    // 1. Persist active state to MongoDB Atlas (upsert single document)
    const stateDoc = await NavigationState.findOneAndUpdate(
      {},
      {
        $set: {
          mode: targetMode,
          action: targetAction,
          source: targetSource,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Prevent consecutive duplicate audit entries (e.g. repeated STOP spam)
    const lastAudit = await NavAuditLog.findOne().sort({ createdAt: -1 });
    const isConsecutiveDuplicate =
      lastAudit &&
      lastAudit.action === targetAction &&
      lastAudit.mode === targetMode &&
      lastAudit.source === targetSource;

    if (!isConsecutiveDuplicate) {
      await NavAuditLog.create({
        action: targetAction,
        mode: targetMode,
        source: targetSource,
      });
    }

    res.status(200).json({
      success: true,
      message: `Command '${targetAction}' registered in ${targetMode} mode (${targetSource})`,
      data: {
        mode: targetMode,
        action: targetAction,
        source: targetSource,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to dispatch navigation command.",
      error: error.message,
    });
  }
};

// polled by esp32 bot every 300-500ms to fetch next instruction
// GET /api/navigation/command
const getNavCommand = async (req, res) => {
  try {
    const stateDoc = await NavigationState.findOne();
    res.status(200).json({
      mode: stateDoc ? stateDoc.mode : "MANUAL",
      action: stateDoc ? stateDoc.action : "STOP",
    });
  } catch (error) {
    res.status(200).json({
      mode: "MANUAL",
      action: "STOP",
    });
  }
};

// pushed by esp32 bot to report live proximity and hardware obstacle override
// POST /api/navigation/status
const postNavStatus = async (req, res) => {
  try {
    const { distanceCm, obstacleDetected, executedAction } = req.body;
    const updateFields = {};

    if (distanceCm !== undefined) {
      updateFields.distanceCm = Number(distanceCm);
    }
    if (obstacleDetected !== undefined) {
      updateFields.obstacleDetected = Boolean(obstacleDetected);
    }
    if (executedAction) {
      updateFields.executedAction = String(executedAction).toUpperCase();
    }

    await NavigationState.findOneAndUpdate(
      {},
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update navigation status.",
      error: error.message,
    });
  }
};

// polled by react ui to update proximity radar, obstacle alert, and command audit trail
// GET /api/navigation/status
const getNavStatus = async (req, res) => {
  try {
    // 1. Fetch live active navigation state from MongoDB Atlas
    let stateDoc = await NavigationState.findOne();
    if (!stateDoc) {
      stateDoc = await NavigationState.create(DEFAULT_NAV_STATE);
    }

    // 2. Fetch latest 10 command audit logs from MongoDB Atlas
    const logs = await NavAuditLog.find().sort({ createdAt: -1 }).limit(10);
    const history = logs.map((item) => ({
      action: item.action,
      mode: item.mode,
      source: item.source,
      time: new Date(item.createdAt).toLocaleTimeString(),
      createdAt: item.createdAt,
    }));

    const now = Date.now();
    const isBotActive =
      stateDoc.updatedAt && now - new Date(stateDoc.updatedAt).getTime() < 15000;

    res.status(200).json({
      success: true,
      data: {
        mode: stateDoc.mode,
        action: stateDoc.action,
        source: stateDoc.source,
        distanceCm: stateDoc.distanceCm,
        obstacleDetected: stateDoc.obstacleDetected,
        executedAction: stateDoc.executedAction,
        isBotActive,
        history,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve navigation status.",
      error: error.message,
    });
  }
};

// clear in-memory and persistent command audit trail
// DELETE /api/navigation/history or POST /api/navigation/clear-history
const clearNavHistory = async (req, res) => {
  try {
    await NavAuditLog.deleteMany({});
    res.status(200).json({
      success: true,
      message: "Command audit trail cleared successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear audit trail.",
      error: error.message,
    });
  }
};

module.exports = {
  postNavCommand,
  getNavCommand,
  postNavStatus,
  getNavStatus,
  clearNavHistory,
};
