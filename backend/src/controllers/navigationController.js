// navigation controller — handles two-way bot navigation commands, emergency stop priority, and obstacle telemetry
const NavigationState = require("../models/NavigationState");
const NavAuditLog = require("../models/NavAuditLog");

// in-memory active state for sub-millisecond polling by esp32
let activeNavState = {
  mode: "MANUAL",
  action: "STOP",
  source: "MANUAL",
  distanceCm: 999,
  obstacleDetected: false,
  executedAction: "STOP",
  lastUpdated: null,
};

// in-memory capped audit list (last 10 commands)
let recentAuditList = [];

// heartbeat tracker
let navBotLastSeen = null;

// update active navigation instruction from react controller (d-pad or voice)
// POST /api/navigation/command
const postNavCommand = async (req, res) => {
  try {
    const { mode, action, source } = req.body;

    const targetAction = action ? action.toUpperCase() : "STOP";
    let targetMode = mode ? mode.toUpperCase() : activeNavState.mode;
    const targetSource = source ? source.toUpperCase() : "MANUAL";

    // emergency stop priority: any stop command immediately forces mode to manual
    if (targetAction === "STOP") {
      targetMode = "MANUAL";
    }

    activeNavState.mode = targetMode;
    activeNavState.action = targetAction;
    activeNavState.source = targetSource;
    activeNavState.lastUpdated = new Date().toISOString();

    // prevent consecutive duplicate entries from spamming the audit trail (e.g. repetitive STOP after STOP)
    const isConsecutiveDuplicate =
      recentAuditList.length > 0 &&
      recentAuditList[0].action === targetAction &&
      recentAuditList[0].mode === targetMode &&
      recentAuditList[0].source === targetSource;

    if (!isConsecutiveDuplicate) {
      const auditEntry = {
        action: targetAction,
        mode: targetMode,
        source: targetSource,
        time: new Date().toLocaleTimeString(),
        createdAt: new Date(),
      };

      recentAuditList = [auditEntry, ...recentAuditList.slice(0, 9)];

      // persist audit log entry
      NavAuditLog.create({
        action: targetAction,
        mode: targetMode,
        source: targetSource,
      }).catch(() => {});
    }

    // background persistence to mongodb (single active state document upsert)
    NavigationState.findOneAndUpdate(
      {},
      {
        mode: targetMode,
        action: targetAction,
        source: targetSource,
        distanceCm: activeNavState.distanceCm,
        obstacleDetected: activeNavState.obstacleDetected,
        executedAction: activeNavState.executedAction,
      },
      { upsert: true, new: true }
    ).catch(() => {});

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
const getNavCommand = (req, res) => {
  navBotLastSeen = Date.now();

  res.status(200).json({
    mode: activeNavState.mode,
    action: activeNavState.action,
  });
};

// pushed by esp32 bot to report live proximity and hardware obstacle override
// POST /api/navigation/status
const postNavStatus = (req, res) => {
  try {
    navBotLastSeen = Date.now();

    const { distanceCm, obstacleDetected, executedAction } = req.body;

    if (distanceCm !== undefined) {
      activeNavState.distanceCm = Number(distanceCm);
    }

    if (obstacleDetected !== undefined) {
      activeNavState.obstacleDetected = Boolean(obstacleDetected);
    }

    if (executedAction) {
      activeNavState.executedAction = String(executedAction).toUpperCase();
    }

    activeNavState.lastUpdated = new Date().toISOString();

    // background persistence to mongodb (single active state document upsert)
    NavigationState.findOneAndUpdate(
      {},
      {
        mode: targetMode,
        action: targetAction,
        source: targetSource,
        distanceCm: activeNavState.distanceCm,
        obstacleDetected: activeNavState.obstacleDetected,
        executedAction: activeNavState.executedAction,
      },
      { upsert: true, new: true }
    ).catch(() => {});

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update navigation status.",
      error: error.message,
    });
  }
};

// polled by react ui to update proximity radar, obstacle alert, and command echo
// GET /api/navigation/status
const getNavStatus = (req, res) => {
  const now = Date.now();
  const isBotActive = navBotLastSeen !== null && now - navBotLastSeen < 12000;

  res.status(200).json({
    success: true,
    data: {
      ...activeNavState,
      isBotActive,
      history: recentAuditList,
    },
  });
};

// clear in-memory and persistent command audit trail
// DELETE /api/navigation/history or POST /api/navigation/clear-history
const clearNavHistory = async (req, res) => {
  try {
    recentAuditList = [];
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
