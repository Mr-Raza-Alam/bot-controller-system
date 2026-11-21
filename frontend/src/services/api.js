// centralized api service connecting frontend to backend
const RAW_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const BASE_URL = RAW_URL.replace(/\/+$/, "");

// check server health / trigger wake-up during exhibition mini-test
export const pingServer = async () => {
  try {
    const res = await fetch(`${BASE_URL}/`, { method: "GET" });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// check if the bot hardware is currently online / heartbeat status
export const getBotStatus = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/command/bot-status`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- FLAME SUBSYSTEM ENDPOINTS ---

export const getFlameLive = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/flame/live`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getFlameLogs = async (limit = 10) => {
  try {
    const res = await fetch(`${BASE_URL}/api/flame/logs?limit=${limit}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const updateFlameThreshold = async (threshold) => {
  try {
    const res = await fetch(`${BASE_URL}/api/flame/threshold`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const postFlameRaw = async (flameRaw) => {
  try {
    const res = await fetch(`${BASE_URL}/api/flame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flameRaw }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- AIR SAFETY (GAS & SMOKE) SUBSYSTEM ENDPOINTS ---

export const getGasLive = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/gas/live`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const calibrateGasBaseline = async (baseline) => {
  try {
    const res = await fetch(`${BASE_URL}/api/gas/calibrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseline }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getGasLogs = async (limit = 10) => {
  try {
    const res = await fetch(`${BASE_URL}/api/gas/logs?limit=${limit}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const postGasRaw = async (gasRaw) => {
  try {
    const res = await fetch(`${BASE_URL}/api/gas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gasRaw }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- HEALTH VITALS (MAX30102) SUBSYSTEM ENDPOINTS ---

export const getVitalsLive = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/vitals/live`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const saveVitalCheckup = async (checkType = "BOTH") => {
  try {
    const res = await fetch(`${BASE_URL}/api/vitals/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkType }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getVitalsLogs = async (limit = 10) => {
  try {
    const res = await fetch(`${BASE_URL}/api/vitals/logs?limit=${limit}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const postVitalsRaw = async (vitalsData) => {
  try {
    const res = await fetch(`${BASE_URL}/api/vitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vitalsData),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- TWO-WAY SMART NAVIGATION & OBSTACLE RADAR ENDPOINTS ---

// send drive instruction or mode switch from virtual controller
export const postNavCommand = async ({ mode, action, source = "MANUAL" }) => {
  try {
    const res = await fetch(`${BASE_URL}/api/navigation/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, action, source }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// poll instruction from esp32 bot
export const getNavCommand = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/navigation/command`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// report obstacle proximity and executed action from esp32 bot
export const postNavStatus = async ({ distanceCm, obstacleDetected, executedAction }) => {
  try {
    const res = await fetch(`${BASE_URL}/api/navigation/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distanceCm, obstacleDetected, executedAction }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// poll live navigation state, radar proximity, and audit history from react ui
export const getNavStatus = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/navigation/status`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// clear navigation command audit trail
export const clearNavHistory = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/navigation/history`, {
      method: "DELETE",
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// --- LEGACY GENERIC COMMAND & SENSOR ENDPOINTS (BACKWARD COMPATIBILITY) ---

export const getLatestSensor = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/sensor`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const postCommand = async (command, source = "button") => {
  try {
    const res = await fetch(`${BASE_URL}/api/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, source }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};
