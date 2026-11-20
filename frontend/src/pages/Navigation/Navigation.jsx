import { useState, useEffect, useRef } from "react";
import { postNavCommand, getNavStatus, clearNavHistory } from "../../services/api";
import { useSecurity } from "../../context/SecurityContext";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import "./Navigation.css";

const Navigation = () => {
  const { isArmed, openUnlockModal } = useSecurity();
  const [navState, setNavState] = useState({
    mode: "MANUAL",
    action: "STOP",
    source: "MANUAL",
    distanceCm: 999,
    obstacleDetected: false,
    executedAction: "STOP",
    isBotActive: false,
    history: [],
  });

  const [activePressedBtn, setActivePressedBtn] = useState(null);
  const [voiceEchoKey, setVoiceEchoKey] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);

  // fetch live navigation status from backend
  const fetchStatus = async () => {
    const res = await getNavStatus();
    if (res.success && res.data) {
      setNavState(res.data);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (!isArmed) return; // In spectator mode, pause loop to save 304 network traffic
    const interval = setInterval(fetchStatus, 800);
    return () => clearInterval(interval);
  }, [isArmed]);

  // bilingual voice recognition (English + Hinglish)
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-IN"; // English (India)
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript.trim().toLowerCase();
      setTranscript(speech);
      setIsListening(false);

      // bilingual keyword parsing
      if (speech.includes("forward") || speech.includes("aage") || speech.includes("go") || speech.includes("chal")) {
        triggerVoiceAction("FORWARD");
      } else if (speech.includes("back") || speech.includes("peeche") || speech.includes("reverse") || speech.includes("piche")) {
        triggerVoiceAction("BACKWARD");
      } else if (speech.includes("left") || speech.includes("baaye") || speech.includes("baye")) {
        triggerVoiceAction("LEFT");
      } else if (speech.includes("right") || speech.includes("daaye") || speech.includes("daye")) {
        triggerVoiceAction("RIGHT");
      } else if (speech.includes("stop") || speech.includes("ruko") || speech.includes("halt") || speech.includes("tham")) {
        triggerVoiceAction("STOP");
      } else if (speech.includes("auto") || speech.includes("autonomous") || speech.includes("roam")) {
        handleModeSwitch("AUTONOMOUS");
      } else if (speech.includes("manual") || speech.includes("control")) {
        handleModeSwitch("MANUAL");
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    window._navVoice = recognition;
  }, []);

  // optimistic local audit log recorder for instant 0ms UI feedback
  const recordOptimisticAudit = (action, mode = "MANUAL", source = "MANUAL") => {
    const entry = {
      action,
      mode,
      source,
      time: new Date().toLocaleTimeString(),
      createdAt: new Date(),
    };
    setNavState((prev) => {
      const prevHistory = prev.history || [];
      const isDup =
        prevHistory.length > 0 &&
        prevHistory[0].action === action &&
        prevHistory[0].mode === mode &&
        prevHistory[0].source === source;
      return {
        ...prev,
        action,
        mode,
        source,
        history: isDup ? prevHistory : [entry, ...prevHistory.slice(0, 9)],
      };
    });
  };

  // trigger voice action with visual echo on d-pad
  const triggerVoiceAction = async (action) => {
    setVoiceEchoKey(action);
    setTimeout(() => setVoiceEchoKey(null), 1200);

    recordOptimisticAudit(action, navState.mode, "VOICE");

    const res = await postNavCommand({
      mode: navState.mode,
      action,
      source: "VOICE",
    });

    if (res.success && res.data?.history) {
      setNavState((prev) => ({ ...prev, history: res.data.history }));
    } else {
      fetchStatus();
    }
  };

  const toggleVoice = () => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    if (!speechSupported || !window._navVoice) return;
    if (isListening) {
      window._navVoice.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      window._navVoice.start();
      setIsListening(true);
    }
  };

  // mode switch (MANUAL vs AUTONOMOUS)
  const handleModeSwitch = async (newMode) => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    const newAction = newMode === "AUTONOMOUS" ? "FORWARD" : "STOP";
    recordOptimisticAudit(newAction, newMode, "MANUAL");

    const res = await postNavCommand({
      mode: newMode,
      action: newAction,
      source: "MANUAL",
    });

    if (res.success && res.data?.history) {
      setNavState((prev) => ({ ...prev, history: res.data.history, mode: newMode, action: newAction }));
    } else {
      fetchStatus();
    }
  };

  // press-and-hold touch controls
  const handlePointerDown = async (direction) => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    if (navState.mode === "AUTONOMOUS") return;
    setActivePressedBtn(direction);
    recordOptimisticAudit(direction, "MANUAL", "MANUAL");

    const res = await postNavCommand({
      mode: "MANUAL",
      action: direction,
      source: "MANUAL",
    });

    if (res.success && res.data?.history) {
      setNavState((prev) => ({ ...prev, history: res.data.history }));
    }
  };

  const handlePointerUp = async () => {
    if (!isArmed) return;
    if (navState.mode === "AUTONOMOUS") return;
    setActivePressedBtn(null);
    recordOptimisticAudit("STOP", "MANUAL", "MANUAL");

    const res = await postNavCommand({
      mode: "MANUAL",
      action: "STOP",
      source: "MANUAL",
    });

    if (res.success && res.data?.history) {
      setNavState((prev) => ({ ...prev, history: res.data.history }));
    }
  };

  // sweep and clear command audit trail
  const handleClearAuditTrail = async () => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    setNavState((prev) => ({ ...prev, history: [] }));
    await clearNavHistory();
  };

  // emergency stop button
  const handleEmergencyStop = async () => {
    if (!isArmed) {
      openUnlockModal();
      return;
    }
    setActivePressedBtn(null);
    recordOptimisticAudit("STOP", "MANUAL", "MANUAL");

    const res = await postNavCommand({
      mode: "MANUAL",
      action: "STOP",
      source: "MANUAL",
    });

    if (res.success && res.data?.history) {
      setNavState((prev) => ({ ...prev, history: res.data.history, mode: "MANUAL", action: "STOP" }));
    } else {
      fetchStatus();
    }
  };

  const isAutonomous = navState.mode === "AUTONOMOUS";
  const isBlocked = navState.obstacleDetected || navState.distanceCm < 15;

  return (
    <div className="navigation-container">
      {/* 70 : 30 SPLIT COCKPIT LAYOUT */}
      <div className="nav-split-layout">
        
        {/* LEFT COLUMN (70%): SMART NAVIGATION HERO CARD */}
        <section className="station-card nav-hero-card">
          {/* card header */}
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

          {/* stream & security status strip */}
          <div className={`nav-security-stream-strip ${isArmed ? "strip-armed" : "strip-spectator"}`}>
            <span className={`stream-signal-dot ${isArmed ? "signal-active" : "signal-standby"}`}></span>
            <span className="stream-status-text">
              {isArmed
                ? "TELEMETRY LINK: ACTIVE (800ms LIVE STREAM)"
                : "STREAM PAUSED (SPECTATOR MODE • ENTER PIN TO ARM)"}
            </span>
            {!isArmed && (
              <button
                type="button"
                className="stream-unlock-trigger-btn"
                onClick={openUnlockModal}
              >
                Unlock
              </button>
            )}
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
              <span className={`ribbon-val ${isBlocked ? "text-danger" : "text-safe"}`}>
                {navState.distanceCm} cm
              </span>
            </div>
          </div>

          {/* safety override notice if obstacle blocked */}
          {isBlocked && (
            <div className="nav-safety-warning-strip">
              SAFETY ENGAGED: Obstacle detected (&lt;15cm). Motors halted locally on ESP32.
            </div>
          )}

          {/* voice commander button & child guide */}
          <div className="voice-control-block">
            <button
              className={`voice-commander-black-btn ${isListening ? "voice-listening" : ""}`}
              onClick={toggleVoice}
              disabled={!speechSupported}
            >
              {isListening ? "Listening... Speak Now" : "Voice Commander"}
            </button>

            <button
              className="voice-child-trigger-btn"
              onClick={() => setShowVoiceGuide(!showVoiceGuide)}
              type="button"
            >
              {showVoiceGuide ? "Hide Voice Command Guide" : "Voice Commands Guide (English + Hinglish)"}
            </button>

            {transcript && (
              <div className="voice-transcript-banner">
                Heard: <strong>"{transcript}"</strong>
              </div>
            )}

            {/* child guide drawer under voice commander */}
            {showVoiceGuide && (
              <div className="voice-child-guide-drawer">
                <div className="guide-header-title">
                  Bilingual Voice Command Dictionary (English + Hinglish):
                </div>
                <div className="guide-dictionary-grid">
                  <div className="guide-dict-item">
                    <span className="dict-cmd">FORWARD:</span>
                    <code>"forward"</code>, <code>"aage jao"</code>, <code>"chal"</code>
                  </div>
                  <div className="guide-dict-item">
                    <span className="dict-cmd">BACKWARD:</span>
                    <code>"back"</code>, <code>"peeche"</code>, <code>"reverse"</code>
                  </div>
                  <div className="guide-dict-item">
                    <span className="dict-cmd">TURN LEFT:</span>
                    <code>"left"</code>, <code>"baaye"</code>, <code>"baaye mudo"</code>
                  </div>
                  <div className="guide-dict-item">
                    <span className="dict-cmd">TURN RIGHT:</span>
                    <code>"right"</code>, <code>"daaye"</code>, <code>"daaye mudo"</code>
                  </div>
                  <div className="guide-dict-item">
                    <span className="dict-cmd">EMERGENCY STOP:</span>
                    <code>"stop"</code>, <code>"ruko"</code>, <code>"halt"</code>
                  </div>
                  <div className="guide-dict-item">
                    <span className="dict-cmd">MODES:</span>
                    <code>"auto"</code>, <code>"manual"</code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* cross d-pad layout */}
          <div className="dpad-container-wrap">
            <div className={`dpad-layout ${isAutonomous ? "dpad-locked" : ""}`}>
              <div></div>
              <button
                className={`dpad-key key-fwd ${
                  activePressedBtn === "FORWARD" || voiceEchoKey === "FORWARD" ? "btn-pressed" : ""
                }`}
                onPointerDown={() => handlePointerDown("FORWARD")}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                disabled={isAutonomous}
              >
                &uarr;<br /><span>FWD</span>
              </button>
              <div></div>

              <button
                className={`dpad-key key-left ${
                  activePressedBtn === "LEFT" || voiceEchoKey === "LEFT" ? "btn-pressed" : ""
                }`}
                onPointerDown={() => handlePointerDown("LEFT")}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                disabled={isAutonomous}
              >
                &larr;<br /><span>LEFT</span>
              </button>

              <button className="dpad-key key-stop" onClick={handleEmergencyStop}>
                STOP
              </button>

              <button
                className={`dpad-key key-right ${
                  activePressedBtn === "RIGHT" || voiceEchoKey === "RIGHT" ? "btn-pressed" : ""
                }`}
                onPointerDown={() => handlePointerDown("RIGHT")}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                disabled={isAutonomous}
              >
                &rarr;<br /><span>RIGHT</span>
              </button>

              <div></div>
              <button
                className={`dpad-key key-rev ${
                  activePressedBtn === "BACKWARD" || voiceEchoKey === "BACKWARD" ? "btn-pressed" : ""
                }`}
                onPointerDown={() => handlePointerDown("BACKWARD")}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                disabled={isAutonomous}
              >
                &darr;<br /><span>REV</span>
              </button>
              <div></div>
            </div>

            <p className="dpad-operational-hint">
              {isAutonomous
                ? "D-Pad directional arrows locked during Autonomous Roam. Center STOP button active."
                : "Press and hold arrow to drive; release finger to brake. Emergency STOP overrides immediately."}
            </p>
          </div>
        </section>

        {/* RIGHT COLUMN (30%): VERTICAL COMMAND AUDIT TRAIL STREAM */}
        <aside className="station-card audit-sidebar-card">
          <div className="telemetry-card-header">
            <div className="card-title-group">
              <span className="module-tag">AUDIT STREAM</span>
              <h3>Command Trail</h3>
            </div>
            <div className="audit-header-actions">
              <span className="audit-count-badge">
                {navState.history?.length || 0} Events
              </span>
              <button
                className="audit-clear-btn"
                onClick={handleClearAuditTrail}
                title="Sweep and clear current command audit trail"
                type="button"
              >
                Clear Trail
              </button>
            </div>
          </div>

          <p className="audit-sidebar-desc">
            Real-time audit log of manual touch, emergency stop, and voice instructions dispatched.
          </p>

          <div className="audit-stream-list">
            {navState.history && navState.history.length === 0 ? (
              <div className="empty-audit-box">
                Command trail is clear. Standby for next dispatch.
              </div>
            ) : (
              navState.history.map((item, idx) => (
                <div key={idx} className="audit-stream-card">
                  <div className="audit-card-top">
                    <span className="audit-action-badge">{item.action}</span>
                    <span className={`audit-source-pill ${item.source === "VOICE" ? "pill-voice" : "pill-manual"}`}>
                      {item.source}
                    </span>
                  </div>
                  <div className="audit-card-meta">
                    <span className="audit-card-time">
                      {item.time || new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="audit-card-mode">{item.mode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

      </div>
    </div>
  );
};

export default Navigation;
