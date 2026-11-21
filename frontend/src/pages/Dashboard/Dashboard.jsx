import { useState, useEffect } from "react";
import { useSecurity } from "../../context/SecurityContext";
import {
  getLatestSensor,
  getFlameLive,
  getGasLive,
  getVitalsLive,
  getNavStatus,
  postNavCommand,
  pingServer,
  getBotStatus,
} from "../../services/api";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import PilotManual from "../../components/PilotManual/PilotManual";
import "./Dashboard.css";

const Dashboard = () => {
  const { isArmed, openUnlockModal } = useSecurity();
  // specialized flame telemetry state
  const [flameState, setFlameState] = useState({
    flameRaw: 4095,
    flameIntensity: 0,
    isFireDetected: false,
    threshold: 60,
  });

  // specialized air safety telemetry state
  const [gasState, setGasState] = useState({
    gasRaw: 600,
    gasDelta: 0,
    status: "SAFE",
    baseline: 600,
    isWarmingUp: false,
  });

  // specialized health vitals telemetry state
  const [vitalsState, setVitalsState] = useState({
    heartRate: 0,
    bodyTempC: 36.6,
    bodyTempF: 97.9,
    fingerDetected: false,
    heartStatus: "NO_PULSE",
    tempStatus: "NORMAL",
  });

  // specialized navigation & radar state
  const [navState, setNavState] = useState({
    mode: "MANUAL",
    action: "STOP",
    source: "MANUAL",
    distanceCm: 999,
    obstacleDetected: false,
    executedAction: "STOP",
  });

  // system connection state
  const [serverStatus, setServerStatus] = useState("Checking...");
  const [botStatus, setBotStatus] = useState({ isOnline: false, secondsAgo: null });
  const [isPriming, setIsPriming] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showArchDiagram, setShowArchDiagram] = useState(false);

  // navigation touch feedback
  const [activePressedBtn, setActivePressedBtn] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  // on-demand popup modal state (null = closed, or "FLAME", "AIR", "HEART", "TEMP", "RADAR")
  const [activeModal, setActiveModal] = useState(null);

  // scan triggers feedback
  const [flameFeedback, setFlameFeedback] = useState("Idle");
  const [isScanningFlame, setIsScanningFlame] = useState(false);
  const [healthFeedback, setHealthFeedback] = useState("Idle");
  const [isCheckingVitals, setIsCheckingVitals] = useState(false);

  // background telemetry & heartbeat polling
  const syncTelemetry = async () => {
    // 1. flame status
    const fRes = await getFlameLive();
    if (fRes.success && fRes.data) {
      setFlameState(fRes.data);
      if (fRes.data.isFireDetected && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    // 2. gas status
    const gRes = await getGasLive();
    if (gRes.success && gRes.data) {
      setGasState(gRes.data);
      if (gRes.data.status === "HAZARDOUS" && navigator.vibrate) {
        navigator.vibrate([150, 100, 150]);
      }
    }

    // 3. vitals status
    const vRes = await getVitalsLive();
    if (vRes.success && vRes.data) {
      setVitalsState(vRes.data);
    }

    // 4. navigation & radar status
    const nRes = await getNavStatus();
    if (nRes.success && nRes.data) {
      setNavState(nRes.data);
      setLastSync(new Date().toLocaleTimeString());
    }

    // 5. bot heartbeat
    const bRes = await getBotStatus();
    if (bRes.success && bRes.data) {
      setBotStatus(bRes.data);
    }
  };

  useEffect(() => {
    pingServer().then((res) => {
      setServerStatus(res.success ? "Online" : "Offline");
    });
    syncTelemetry();
    if (!isArmed) return; // In spectator mode, pause loop to eliminate 304 network traffic
    const pollTimer = setInterval(syncTelemetry, 1500);
    return () => clearInterval(pollTimer);
  }, [isArmed]);

  // escape key listener to close popup modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // bilingual voice recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript.trim().toLowerCase();
      setTranscript(speech);
      setIsListening(false);

      if (speech.includes("forward") || speech.includes("aage") || speech.includes("go")) {
        handleNavCommand("FORWARD", "VOICE");
      } else if (speech.includes("back") || speech.includes("peeche") || speech.includes("reverse")) {
        handleNavCommand("BACKWARD", "VOICE");
      } else if (speech.includes("left") || speech.includes("baaye")) {
        handleNavCommand("LEFT", "VOICE");
      } else if (speech.includes("right") || speech.includes("daaye")) {
        handleNavCommand("RIGHT", "VOICE");
      } else if (speech.includes("stop") || speech.includes("ruko") || speech.includes("halt")) {
        handleNavCommand("STOP", "VOICE");
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    window._cockpitVoice = recognition;
  }, []);

  const toggleVoice = () => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    if (!speechSupported || !window._cockpitVoice) return;
    if (isListening) {
      window._cockpitVoice.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      window._cockpitVoice.start();
      setIsListening(true);
    }
  };

  // navigation commands
  const handleNavCommand = async (action, source = "MANUAL") => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    await postNavCommand({
      mode: navState.mode,
      action,
      source,
    });
    syncTelemetry();
  };

  // press-and-hold touch handlers
  const handlePointerDown = async (direction) => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    if (navState.mode === "AUTONOMOUS") return;
    setActivePressedBtn(direction);
    await postNavCommand({
      mode: "MANUAL",
      action: direction,
      source: "MANUAL",
    });
    syncTelemetry();
  };

  const handlePointerUp = async () => {
    if (!isArmed) return;
    if (navState.mode === "AUTONOMOUS") return;
    setActivePressedBtn(null);
    await postNavCommand({
      mode: "MANUAL",
      action: "STOP",
      source: "MANUAL",
    });
    syncTelemetry();
  };

  const handleModeSwitch = async (newMode) => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    await postNavCommand({
      mode: newMode,
      action: newMode === "AUTONOMOUS" ? "FORWARD" : "STOP",
      source: "MANUAL",
    });
    syncTelemetry();
  };

  // on-demand event-driven flame scan trigger
  const triggerFlameScan = async () => {
    setIsScanningFlame(true);
    setFlameFeedback("Sampling IR spectrum...");
    setTimeout(async () => {
      await syncTelemetry();
      setFlameFeedback("Scan complete");
      setIsScanningFlame(false);
    }, 1400);
  };

  // health vitals trigger
  const triggerHealthCheck = async () => {
    setIsCheckingVitals(true);
    setHealthFeedback("Reading biosensor...");
    setTimeout(async () => {
      await syncTelemetry();
      setHealthFeedback("Vitals synced");
      setIsCheckingVitals(false);
    }, 1500);
  };

  // exhibition mini-test protocol
  const runMiniTest = async () => {
    setIsPriming(true);
    setServerStatus("Connecting...");
    await pingServer();
    setTimeout(async () => {
      await syncTelemetry();
      setServerStatus("Online");
      setIsPriming(false);
    }, 1200);
  };

  const isFire = flameState.isFireDetected;
  const isGasHazard = gasState.status === "HAZARDOUS";
  const isGasSmoke = gasState.status === "MODERATE";
  const isObstacleBlocked = navState.obstacleDetected || navState.distanceCm < 15;
  const isAutonomous = navState.mode === "AUTONOMOUS";

  return (
    <div className="commander-station">
      {/* card 1: system overview bar */}
      <header className="station-header">
        <div className="station-meta">
          <h2>Commander Cockpit</h2>
          <div className="connection-indicator">
            <span className={`status-dot ${serverStatus === "Online" ? "dot-online" : "dot-offline"}`}></span>
            <span className="connection-text">Broker: <strong>{serverStatus}</strong></span>
            <span className="separator">|</span>
            <span className={`status-dot ${botStatus.isOnline ? "dot-online" : "dot-offline"}`}></span>
            <span className="connection-text">
              Bot: <strong>{botStatus.isOnline ? "Online" : botStatus.secondsAgo !== null ? `Standby (${botStatus.secondsAgo}s)` : "Offline"}</strong>
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`secondary-btn ${activeModal === "MANUAL" ? "btn-active-arch" : ""}`}
            onClick={() => setActiveModal(activeModal === "MANUAL" ? null : "MANUAL")}
          >
            Flight Manual
          </button>
          <button
            className={`secondary-btn ${activeModal === "ARCHITECTURE" ? "btn-active-arch" : ""}`}
            onClick={() => setActiveModal(activeModal === "ARCHITECTURE" ? null : "ARCHITECTURE")}
          >
            System Architecture
          </button>
          <button
            className={`mini-test-btn ${isPriming ? "btn-priming" : ""}`}
            onClick={runMiniTest}
            disabled={isPriming}
          >
            {isPriming ? "Connecting..." : "Run System Check"}
          </button>
        </div>
      </header>

      {/* global safety warning banner (if hazard occurs) */}
      {isFire && (
        <div className="hazard-banner fire-banner">
          CRITICAL: FIRE DETECTED BY PERIMETER SENSORS - BOT BUZZER ACTIVE
        </div>
      )}
      {isGasHazard && (
        <div className="hazard-banner gas-banner">
          CRITICAL: HAZARDOUS GAS SPIKE DETECTED - VENTILATE PERIMETER
        </div>
      )}
      {isObstacleBlocked && (
        <div className="hazard-banner halt-banner">
          SAFETY ENGAGED: OBSTACLE DETECTED (&lt;15CM) - HARDWARE OVERRIDE HALTED MOTORS
        </div>
      )}

      {/* card 2: smart navigation module centrally positioned */}
      <section className="station-card nav-module central-nav-card">
        <div className="module-header">
          <div className="module-title-group">
            <span className="module-tag">DRIVE</span>
            <h3>Smart Navigation</h3>
          </div>

          <div className="mode-pill-selector">
            <button
              className={`pill-btn ${!isAutonomous ? "pill-active" : ""}`}
              onClick={() => handleModeSwitch("MANUAL")}
            >
              MANUAL
            </button>
            <button
              className={`pill-btn ${isAutonomous ? "pill-active" : ""}`}
              onClick={() => handleModeSwitch("AUTONOMOUS")}
            >
              AUTO-PILOT
            </button>
          </div>
        </div>

        {/* execution ribbon */}
        <div className="nav-cockpit-ribbon">
          <div className="cockpit-ribbon-item">
            <span className="ribbon-key">Mode:</span>
            <span className="ribbon-val">{navState.mode}</span>
          </div>
          <div className="cockpit-ribbon-item">
            <span className="ribbon-key">Instruction:</span>
            <span className="ribbon-val">{navState.action}</span>
          </div>
          <div className="cockpit-ribbon-item">
            <span className="ribbon-key">Motors:</span>
            <span className="ribbon-val">{navState.executedAction}</span>
          </div>
          <div className="cockpit-ribbon-item">
            <span className="ribbon-key">Obstacle:</span>
            <span className={`ribbon-val ${isObstacleBlocked ? "text-danger" : "text-safe"}`}>
              {navState.distanceCm} cm
            </span>
          </div>
        </div>

        {/* voice command subsection */}
        <div className="voice-subpanel">
          {speechSupported ? (
            <div className="voice-action-row">
              <button
                className={`voice-btn ${isListening ? "voice-listening" : ""}`}
                onClick={toggleVoice}
              >
                {isListening ? "Listening... Speak command" : "Voice Commander"}
              </button>
              {transcript && <span className="transcript-badge">Heard: "{transcript}"</span>}
            </div>
          ) : (
            <span className="unsupported-hint">Voice unavailable in browser - use D-Pad</span>
          )}
        </div>

        {/* virtual d-pad with press and hold */}
        <div className={`dpad-layout ${isAutonomous ? "dpad-locked" : ""}`}>
          <div></div>
          <button
            className={`dpad-key key-fwd ${activePressedBtn === "FORWARD" ? "btn-pressed" : ""}`}
            onPointerDown={() => handlePointerDown("FORWARD")}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isAutonomous}
          >
            &uarr;<br /><span>FWD</span>
          </button>
          <div></div>

          <button
            className={`dpad-key key-left ${activePressedBtn === "LEFT" ? "btn-pressed" : ""}`}
            onPointerDown={() => handlePointerDown("LEFT")}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isAutonomous}
          >
            &larr;<br /><span>LEFT</span>
          </button>
          <button className="dpad-key key-stop" onClick={() => handleNavCommand("STOP")}>
            STOP
          </button>
          <button
            className={`dpad-key key-right ${activePressedBtn === "RIGHT" ? "btn-pressed" : ""}`}
            onPointerDown={() => handlePointerDown("RIGHT")}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isAutonomous}
          >
            &rarr;<br /><span>RIGHT</span>
          </button>

          <div></div>
          <button
            className={`dpad-key key-rev ${activePressedBtn === "BACKWARD" ? "btn-pressed" : ""}`}
            onPointerDown={() => handlePointerDown("BACKWARD")}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isAutonomous}
          >
            &darr;<br /><span>REV</span>
          </button>
          <div></div>
        </div>
      </section>

      {/* card 3: onboard subsystem telemetry launcher hub with popup report cards */}
      <section className="station-card telemetry-hub-card">
          <div className="telemetry-hub-header">
            <div className="telemetry-hub-title-group">
              <span className="module-tag">LIVE SENSORS</span>
              <h3>Onboard Subsystem Telemetry</h3>
              <p className="telemetry-hub-sub">
                Select any sub-functionality below to open its live popup telemetry report card.
              </p>
            </div>
            <div className="telemetry-hub-count-badge">
              4 Subsystems Armed
            </div>
          </div>

          {/* interactive sub-functionality popup trigger buttons */}
          <div className="telemetry-options-toolbar">
            <button
              className={`telemetry-opt-btn ${isFire ? "opt-danger" : ""}`}
              onClick={() => setActiveModal("FLAME")}
            >
              <span className="opt-indicator"></span>
              Flame
              <span className="popup-trigger-hint">Inspect</span>
            </button>

            <button
              className={`telemetry-opt-btn ${isGasHazard ? "opt-danger" : isGasSmoke ? "opt-warning" : ""}`}
              onClick={() => setActiveModal("AIR")}
            >
              <span className="opt-indicator"></span>
              Air Safety
              <span className="popup-trigger-hint">Inspect</span>
            </button>

            <button
              className="telemetry-opt-btn"
              onClick={() => setActiveModal("HEART")}
            >
              <span className="opt-indicator"></span>
              Heart Rate
              <span className="popup-trigger-hint">Inspect</span>
            </button>

            <button
              className="telemetry-opt-btn"
              onClick={() => setActiveModal("TEMP")}
            >
              <span className="opt-indicator"></span>
              Body Temp
              <span className="popup-trigger-hint">Inspect</span>
            </button>

            <button
              className={`telemetry-opt-btn ${isObstacleBlocked ? "opt-danger" : ""}`}
              onClick={() => setActiveModal("RADAR")}
            >
              <span className="opt-indicator"></span>
              Radar
              <span className="popup-trigger-hint">Inspect</span>
            </button>
          </div>

          <div className="telemetry-launcher-footer-note">
            Each subsystem runs independently on edge hardware. Tap any button above to pop up its live telemetry diagnostic card.
          </div>
        </section>

      {/* POPUP MODAL REPORT CARD (Opens when any subsystem option or System Architecture is selected) */}
      {activeModal && (
        <div className="telemetry-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className={`telemetry-popup-modal ${
              activeModal === "MANUAL" || activeModal === "ARCHITECTURE" ? "modal-wide" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-tag">
                  {activeModal === "ARCHITECTURE"
                    ? "SYSTEM TOPOLOGY"
                    : activeModal === "MANUAL"
                    ? "PILOT NOTEBOOK & FIELD MANUAL"
                    : "LIVE REPORT CARD"}
                </span>
                <h3>
                  {activeModal === "FLAME" && "Flame Detection Telemetry"}
                  {activeModal === "AIR" && "Air Safety & Gas Telemetry"}
                  {activeModal === "HEART" && "Heart Rate Biometrics Telemetry"}
                  {activeModal === "TEMP" && "Body Temperature Screening"}
                  {activeModal === "RADAR" && "Obstacle Avoidance Radar"}
                  {activeModal === "ARCHITECTURE" && "System Architecture Topology"}
                  {activeModal === "MANUAL" && "Virtual Controller Operations Notebook"}
                </h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                &#10005;
              </button>
            </div>

            {/* modal content body */}
            <div className="modal-body">
              {/* 1. FLAME DETECTION REPORT */}
              {activeModal === "FLAME" && (
                <div className={`popup-report-content ${isFire ? "report-hazard" : ""}`}>
                  <div className="report-badge-row">
                    <span className="report-subtag">OPTICAL INFRARED</span>
                    <StatusBadge
                      label={isFire ? "FIRE DETECTED" : "SAFE"}
                      type={isFire ? "danger" : "safe"}
                    />
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Normalized Fire Intensity:</span>
                    <span className="metric-value font-highlight">{flameState.flameIntensity}%</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Raw ESP32 ADC Reading:</span>
                    <span className="metric-value">{flameState.flameRaw} (0=Fire, 4095=Safe)</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Active Alarm Threshold:</span>
                    <span className="metric-value">{flameState.threshold}%</span>
                  </div>

                  <div className="proximity-meter-track modal-meter-track">
                    <div
                      className={`proximity-meter-fill ${isFire ? "meter-danger" : "meter-safe"}`}
                      style={{ width: `${Math.min(100, Math.max(4, flameState.flameIntensity))}%` }}
                    ></div>
                  </div>

                  <div className="modal-action-bar">
                    <button
                      className="module-action-btn"
                      onClick={triggerFlameScan}
                      disabled={isScanningFlame}
                    >
                      {isScanningFlame ? "Sampling IR Spectrum..." : "Scan Environment Now"}
                    </button>
                    <span className="component-feedback-note">{flameFeedback}</span>
                  </div>
                </div>
              )}

              {/* 2. AIR SAFETY REPORT */}
              {activeModal === "AIR" && (
                <div className={`popup-report-content ${isGasHazard ? "report-hazard" : ""}`}>
                  <div className="report-badge-row">
                    <span className="report-subtag">MQ-2 ELECTROCHEMICAL</span>
                    <StatusBadge
                      label={
                        isGasHazard
                          ? "GAS LEAK ALERT"
                          : isGasSmoke
                          ? "SMOKE DETECTED"
                          : "AIR QUALITY SAFE"
                      }
                      type={isGasHazard ? "danger" : isGasSmoke ? "warning" : "safe"}
                    />
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Relative Gas / Smoke Spike (Delta):</span>
                    <span className="metric-value font-highlight">+{gasState.gasDelta}</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Calibrated Room Baseline:</span>
                    <span className="metric-value">{gasState.baseline} ADC</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Current Raw Sensor Value:</span>
                    <span className="metric-value">{gasState.gasRaw} ADC</span>
                  </div>

                  <div className="proximity-meter-track modal-meter-track">
                    <div
                      className={`proximity-meter-fill ${
                        isGasHazard ? "meter-danger" : isGasSmoke ? "meter-warning" : "meter-safe"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, (gasState.gasDelta / 800) * 100))}%` }}
                    ></div>
                  </div>

                  <div className="live-telemetry-tag">
                    <span className="pulse-indicator"></span>
                    {gasState.isWarmingUp
                      ? "Sensor Heating Coil Stabilizing (20s)..."
                      : "Ambient Room Baseline Calibrated & Normalized"}
                  </div>
                </div>
              )}

              {/* 3. HEART RATE REPORT */}
              {activeModal === "HEART" && (
                <div className="popup-report-content">
                  <div className="report-badge-row">
                    <span className="report-subtag">MAX30102 PHOTOPLETHYSMOGRAPHY</span>
                    <StatusBadge
                      label={
                        !vitalsState.fingerDetected
                          ? "NO FINGER CONTACT"
                          : vitalsState.heartStatus === "ELEVATED"
                          ? "FATIGUE / ELEVATED"
                          : "NORMAL PULSE"
                      }
                      type={
                        !vitalsState.fingerDetected
                          ? "neutral"
                          : vitalsState.heartStatus === "ELEVATED"
                          ? "warning"
                          : "safe"
                      }
                    />
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Live Heart Rate:</span>
                    <span className="metric-value font-highlight">
                      {vitalsState.fingerDetected ? `${vitalsState.heartRate} BPM` : "-- (Place Finger)"}
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Optical Finger Sensor:</span>
                    <span className="metric-value">
                      {vitalsState.fingerDetected ? "Contact Established" : "Waiting for Finger"}
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Clinical Classification:</span>
                    <span className="metric-value">
                      {vitalsState.fingerDetected
                        ? vitalsState.heartRate > 100
                          ? "Elevated / Fatigue"
                          : "Resting Physiological Range"
                        : "Awaiting Contact"}
                    </span>
                  </div>

                  <div className="modal-action-bar">
                    <button
                      className="module-action-btn"
                      onClick={triggerHealthCheck}
                      disabled={isCheckingVitals}
                    >
                      {isCheckingVitals ? "Reading Optical Sensor..." : "Sample Pulse Now"}
                    </button>
                    <span className="component-feedback-note">{healthFeedback}</span>
                  </div>
                </div>
              )}

              {/* 4. BODY TEMPERATURE REPORT */}
              {activeModal === "TEMP" && (
                <div className="popup-report-content">
                  <div className="report-badge-row">
                    <span className="report-subtag">MLX90614 INFRARED THERMOMETER</span>
                    <StatusBadge
                      label={
                        vitalsState.tempStatus === "HIGH_FEVER"
                          ? "HIGH FEVER"
                          : vitalsState.tempStatus === "MILD_FEVER"
                          ? "MILD FEVER"
                          : "NORMAL TEMPERATURE"
                      }
                      type={
                        vitalsState.tempStatus === "HIGH_FEVER"
                          ? "danger"
                          : vitalsState.tempStatus === "MILD_FEVER"
                          ? "warning"
                          : "safe"
                      }
                    />
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Surface Temperature (Celsius):</span>
                    <span className="metric-value font-highlight">{vitalsState.bodyTempC} °C</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Fahrenheit Equivalent:</span>
                    <span className="metric-value">{vitalsState.bodyTempF} °F</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Fever Screening Triage:</span>
                    <span className="metric-value">
                      {vitalsState.bodyTempC >= 38.0
                        ? "High Fever Warning"
                        : vitalsState.bodyTempC >= 37.3
                        ? "Mild Fever Observation"
                        : "Normal Body Temperature"}
                    </span>
                  </div>

                  <div className="proximity-meter-track modal-meter-track">
                    <div
                      className={`proximity-meter-fill ${
                        vitalsState.tempStatus === "HIGH_FEVER"
                          ? "meter-danger"
                          : vitalsState.tempStatus === "MILD_FEVER"
                          ? "meter-warning"
                          : "meter-safe"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(10, ((vitalsState.bodyTempC - 34) / (41 - 34)) * 100))}%`,
                      }}
                    ></div>
                  </div>

                  <div className="modal-action-bar">
                    <button
                      className="module-action-btn"
                      onClick={triggerHealthCheck}
                      disabled={isCheckingVitals}
                    >
                      {isCheckingVitals ? "Scanning Thermo Sensor..." : "Screen Temperature Now"}
                    </button>
                    <span className="component-feedback-note">{healthFeedback}</span>
                  </div>
                </div>
              )}

              {/* 5. OBSTACLE RADAR REPORT */}
              {activeModal === "RADAR" && (
                <div className={`popup-report-content ${isObstacleBlocked ? "report-hazard" : ""}`}>
                  <div className="report-badge-row">
                    <span className="report-subtag">HC-SR04 ULTRASONIC TRANSCEIVER</span>
                    <StatusBadge
                      label={isObstacleBlocked ? "OVERRIDE BRAKE" : "PATH CLEAR"}
                      type={isObstacleBlocked ? "danger" : "safe"}
                    />
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Clearance Proximity Distance:</span>
                    <span className="metric-value font-highlight">{navState.distanceCm} cm</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Local Hardware Safety Brake:</span>
                    <span className="metric-value">
                      {isObstacleBlocked ? "Engaged (Motors Cut &lt;15cm)" : "Armed (Safe Clearance)"}
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Sonar Frequency:</span>
                    <span className="metric-value">40 kHz Ultrasonic Burst</span>
                  </div>

                  <div className="proximity-meter-track modal-meter-track">
                    <div
                      className={`proximity-meter-fill ${isObstacleBlocked ? "meter-danger" : "meter-safe"}`}
                      style={{ width: `${Math.min(100, Math.max(4, (navState.distanceCm / 100) * 100))}%` }}
                    ></div>
                  </div>

                  <div className="auto-system-note">
                    {isObstacleBlocked
                      ? "Autonomous Safety Override Active: Motors Halted Locally on ESP32 to Prevent Latency Collision."
                      : "Autonomous Hardware Protection Armed: Path is clear for navigation."}
                  </div>
                </div>
              )}

              {/* 6. SYSTEM ARCHITECTURE MODAL */}
              {activeModal === "ARCHITECTURE" && (
                <div className="popup-report-content arch-modal-popup-content">
                  <div className="report-badge-row">
                    <span className="report-subtag">TIER 1 &bull; TIER 2 &bull; TIER 3</span>
                    <StatusBadge label="VERIFIED MERN + ESP32" type="safe" />
                  </div>

                  <div className="arch-diagram-wrapper">
                    <img
                      src="/Smart Robot Assistant Dashboard.png"
                      alt="System Architecture Diagram"
                      className="arch-img"
                    />
                  </div>

                  <div className="hardware-badge-row">
                    <span className="chip-badge">REACT VIRTUAL COCKPIT</span>
                    <span className="chip-badge">EXPRESS API (PORT 8000)</span>
                    <span className="chip-badge">MONGODB ATLAS</span>
                    <span className="chip-badge">ESP32 FIRMWARE</span>
                  </div>

                  <p className="arch-modal-desc">
                    <strong>Decoupled IoT Architecture:</strong> The React dashboard provides low-latency teleoperation and telemetry observation over REST/HTTP endpoints. The ESP32 edge microcontroller runs a local 50ms polling loop, executing emergency collision halts and alarm triggers locally in hardware with zero internet lag dependencies.
                  </p>
                </div>
              )}

              {/* 7. PILOT MANUAL & FIELD NOTEBOOK */}
              {activeModal === "MANUAL" && (
                <PilotManual onClose={() => setActiveModal(null)} />
              )}
            </div>

            {/* modal footer */}
            <div className="modal-footer">
              <span className="modal-sync-time">
                {activeModal === "ARCHITECTURE"
                  ? "Decoupled Edge Architecture • Verified MERN + ESP32 Topology"
                  : activeModal === "MANUAL"
                  ? "Pilot Operations Manual • Dual ESP32 Decoupled Robotics"
                  : `Live Edge Stream | ${lastSync ? `Synced at ${lastSync}` : "Connected"}`}
              </span>
            </div>
          </div>
        </div>
      )}

      <footer className="station-footer">
        {lastSync && <span>Telemetry Synced: {lastSync}</span>}
        <span>Decoupled Cloud Architecture | Multi-Purpose Bot Assistant</span>
      </footer>
    </div>
  );
};

export default Dashboard;
