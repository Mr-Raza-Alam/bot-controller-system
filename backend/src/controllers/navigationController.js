// navigation controller — persistent cloud state for decoupled bot control & obstacle telemetry
const NavigationState = require("../models/NavigationState");
const NavAuditLog = require("../models/NavAuditLog");

// in-memory fallback state to ensure zero-downtime during cold starts
let memoryNavState = {
  mode: "MANUAL",
  action: "STOP",
  source: "MANUAL",
  distanceCm: 999,
  obstacleDetected: false,
  executedAction: "STOP",
  updatedAt: new Date(),
};

let memoryAuditLogs = [];

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

    // 1. Update in-memory state immediately (zero latency)
    memoryNavState = {
      ...memoryNavState,
      mode: targetMode,
      action: targetAction,
      source: targetSource,
      updatedAt: new Date(),
    };

    // 2. Add to in-memory audit log
    const auditEntry = {
      action: targetAction,
      mode: targetMode,
      source: targetSource,
      time: new Date().toLocaleTimeString(),
      createdAt: new Date(),
    };

    const isDuplicate =
      memoryAuditLogs.length > 0 &&
      memoryAuditLogs[0].action === targetAction &&
      memoryAuditLogs[0].mode === targetMode &&
      memoryAuditLogs[0].source === targetSource;

    if (!isDuplicate) {
      memoryAuditLogs = [auditEntry, ...memoryAuditLogs.slice(0, 9)];
    }

    // 3. Persist to MongoDB Atlas asynchronously
    NavigationState.findOneAndUpdate(
      {},
      {
        $set: {
          mode: targetMode,
          action: targetAction,
          source: targetSource,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).catch((err) => console.warn("Atlas state sync notice:", err.message));

    if (!isDuplicate) {
      NavAuditLog.create({
        action: targetAction,
        mode: targetMode,
        source: targetSource,
      }).catch((err) => console.warn("Atlas audit log notice:", err.message));
    }

    res.status(200).json({
      success: true,
      message: `Command '${targetAction}' registered in ${targetMode} mode (${targetSource})`,
      data: {
        mode: targetMode,
        action: targetAction,
        source: targetSource,
        history: memoryAuditLogs,
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
    const stateDoc = await NavigationState.findOne().lean();
    res.status(200).json({
      mode: stateDoc ? stateDoc.mode : memoryNavState.mode,
      action: stateDoc ? stateDoc.action : memoryNavState.action,
    });
  } catch (error) {
    res.status(200).json({
      mode: memoryNavState.mode,
      action: memoryNavState.action,
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
      memoryNavState.distanceCm = Number(distanceCm);
    }
    if (obstacleDetected !== undefined) {
      updateFields.obstacleDetected = Boolean(obstacleDetected);
      memoryNavState.obstacleDetected = Boolean(obstacleDetected);
    }
    if (executedAction) {
      updateFields.executedAction = String(executedAction).toUpperCase();
      memoryNavState.executedAction = String(executedAction).toUpperCase();
    }
    memoryNavState.updatedAt = new Date();

    NavigationState.findOneAndUpdate(
      {},
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).catch((err) => console.warn("Atlas status sync notice:", err.message));

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
    let mode = memoryNavState.mode;
    let action = memoryNavState.action;
    let source = memoryNavState.source;
    let distanceCm = memoryNavState.distanceCm;
    let obstacleDetected = memoryNavState.obstacleDetected;
    let executedAction = memoryNavState.executedAction;
    let history = memoryAuditLogs;

    // Try reading live from MongoDB Atlas
    try {
      const stateDoc = await NavigationState.findOne().lean();
      if (stateDoc) {
        mode = stateDoc.mode || mode;
        action = stateDoc.action || action;
        source = stateDoc.source || source;
        distanceCm = stateDoc.distanceCm !== undefined ? stateDoc.distanceCm : distanceCm;
        obstacleDetected = stateDoc.obstacleDetected !== undefined ? stateDoc.obstacleDetected : obstacleDetected;
        executedAction = stateDoc.executedAction || executedAction;
      }

      const dbLogs = await NavAuditLog.find().sort({ createdAt: -1 }).limit(10).lean();
      if (dbLogs && dbLogs.length > 0) {
        history = dbLogs.map((item) => ({
          action: item.action,
          mode: item.mode,
          source: item.source,
          time: new Date(item.createdAt).toLocaleTimeString(),
          createdAt: item.createdAt,
        }));
      }
    } catch (dbErr) {
      console.warn("Atlas read fallback to memory:", dbErr.message);
    }

    const now = Date.now();
    const isBotActive =
      memoryNavState.updatedAt && now - new Date(memoryNavState.updatedAt).getTime() < 15000;

    res.status(200).json({
      success: true,
      data: {
        mode,
        action,
        source,
        distanceCm,
        obstacleDetected,
        executedAction,
        isBotActive,
        history,
      },
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        ...memoryNavState,
        isBotActive: false,
        history: memoryAuditLogs,
      },
    });
  }
};

// clear in-memory and persistent command audit trail
// DELETE /api/navigation/history or POST /api/navigation/clear-history
const clearNavHistory = async (req, res) => {
  try {
    memoryAuditLogs = [];
    NavAuditLog.deleteMany({}).catch(() => {});
    res.status(200).json({
      success: true,
      message: "Command audit trail cleared successfully.",
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: "Command audit trail cleared locally.",
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
