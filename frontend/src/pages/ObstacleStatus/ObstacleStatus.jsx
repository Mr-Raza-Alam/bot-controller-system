import { useState, useEffect } from "react";
import { getNavStatus } from "../../services/api";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import "./ObstacleStatus.css";

const ObstacleStatus = () => {
  const [radarState, setRadarState] = useState({
    distanceCm: 999,
    obstacleDetected: false,
    executedAction: "STOP",
    mode: "MANUAL",
    lastUpdated: null,
  });

  // fetch live obstacle and radar status from backend
  const fetchStatus = async () => {
    const res = await getNavStatus();
    if (res.success && res.data) {
      setRadarState(res.data);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 800);
    return () => clearInterval(interval);
  }, []);

  const dist = radarState.distanceCm;
  const isBlocked = radarState.obstacleDetected || dist < 15;
  const isApproaching = dist >= 15 && dist <= 40;
  const isClear = dist > 40;

  // determine active arc zone color
  const arcColor = isBlocked ? "#ef4444" : isApproaching ? "#f59e0b" : "#10b981";

  return (
    <div className="radar-subsystem-container">
      {/* conditional live response banner - ONLY appears when obstacle detected / safety engaged */}
      {isBlocked && (
        <div className="radar-hero-banner banner-hazard">
          <div className="banner-content">
            <span className="banner-label">AUTONOMOUS OBSTACLE EVASION ACTIVE</span>
            <h2 className="banner-headline">
              SAFETY ENGAGED: OBSTACLE DETECTED AT {dist} CM
            </h2>
            <p className="banner-desc">
              Hardware safety loop triggered locally on ESP32. Motors halted to prevent collision.
            </p>
            <div className="evasive-decision-strip">
              <span className="decision-lead">Autonomous Evasive Action:</span>
              <strong className="decision-val">HALT FORWARD DRIVE &rarr; PIVOT RIGHT (+45&deg; CLEARANCE)</strong>
            </div>
          </div>

          <div className="banner-actions">
            <StatusBadge label="OVERRIDE ENGAGED" type="danger" />
          </div>
        </div>
      )}

      {/* forward sonar radar arc card */}
      <div className="telemetry-card radar-arc-card">
        <div className="telemetry-card-header">
          <div className="card-title-group">
            <span className="module-tag">SONAR TELEMETRY</span>
            <h3>Forward Sonar Radar Arc</h3>
          </div>
          <span className="telemetry-tag">15° Beam Angle · 40kHz Ultrasonic</span>
        </div>

        <div className="sonar-canvas-wrap">
          <svg className="sonar-svg" viewBox="0 0 300 160">
            {/* background concentric guide arcs */}
            <path
              d="M 30,150 A 120,120 0 0,1 270,150"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="3"
              strokeDasharray="4 4"
            />
            <path
              d="M 70,150 A 80,80 0 0,1 230,150"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="3"
              strokeDasharray="4 4"
            />
            <path
              d="M 110,150 A 40,40 0 0,1 190,150"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="3"
              strokeDasharray="4 4"
            />

            {/* active illuminated zone arc based on live distance */}
            {isClear && (
              <path
                d="M 30,150 A 120,120 0 0,1 270,150"
                fill="none"
                stroke="#10b981"
                strokeWidth="8"
                className="pulse-arc"
              />
            )}

            {isApproaching && (
              <path
                d="M 70,150 A 80,80 0 0,1 230,150"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                className="pulse-arc"
              />
            )}

            {isBlocked && (
              <path
                d="M 110,150 A 40,40 0 0,1 190,150"
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                className="hazard-arc"
              />
            )}

            {/* robot chassis position at base */}
            <circle cx="150" cy="150" r="14" fill="#0f172a" />
            <polygon points="144,142 150,132 156,142" fill="#38bdf8" />
            <text x="150" y="153" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
              BOT
            </text>
          </svg>

          {/* live digital distance readout */}
          <div className="radar-distance-readout">
            <span className="radar-big-num" style={{ color: arcColor }}>
              {dist > 400 ? "400+" : dist}
            </span>
            <span className="radar-unit-label">CM DISTANCE</span>
          </div>
        </div>

        {/* 3-zone color legend */}
        <div className="radar-legend-bar">
          <div className={`legend-zone ${isBlocked ? "zone-active-hazard" : ""}`}>
            <span className="zone-color-swatch red-swatch"></span>
            <div className="zone-text">
              <strong>&lt; 15 cm: Hazard Zone</strong>
              <span>Hardware Auto-Halt Active</span>
            </div>
          </div>

          <div className={`legend-zone ${isApproaching ? "zone-active-warn" : ""}`}>
            <span className="zone-color-swatch amber-swatch"></span>
            <div className="zone-text">
              <strong>15 - 40 cm: Caution Zone</strong>
              <span>Proximity Deceleration</span>
            </div>
          </div>

          <div className={`legend-zone ${isClear ? "zone-active-safe" : ""}`}>
            <span className="zone-color-swatch green-swatch"></span>
            <div className="zone-text">
              <strong>&gt; 40 cm: Clear Zone</strong>
              <span>Full Navigation Permitted</span>
            </div>
          </div>
        </div>
      </div>

      {/* card 3: autonomous safety layer and dynamic evasion telemetry */}
      <div className="telemetry-card">
        <div className="telemetry-card-header">
          <div className="card-title-group">
            <span className="module-tag">SAFETY LAYER</span>
            <h3>Autonomous Safety &amp; Evasion Telemetry</h3>
          </div>
          <span className="telemetry-tag">Local Embedded Interrupt Loop</span>
        </div>

        <div className="evasion-telemetry-grid">
          <div className="evasion-telemetry-item">
            <span className="evasion-key">Corridor Status:</span>
            <span className={`evasion-val ${isBlocked ? "text-hazard" : "text-safe"}`}>
              {isBlocked ? "BLOCKED (<15 CM)" : isApproaching ? "CAUTION (15-40 CM)" : "CLEAR (>40 CM)"}
            </span>
          </div>
          <div className="evasion-telemetry-item">
            <span className="evasion-key">Safety Cutoff:</span>
            <span className={`evasion-val ${isBlocked ? "text-hazard" : "text-safe"}`}>
              {isBlocked ? "ENGAGED (L298N CUTOFF)" : "ARMED (STANDBY)"}
            </span>
          </div>
          <div className="evasion-telemetry-item">
            <span className="evasion-key">Evasive Steering Vector:</span>
            <span className={`evasion-val ${isBlocked ? "text-hazard" : "text-info"}`}>
              {isBlocked ? "PIVOT RIGHT (+45° RE-ROUTE)" : "MAINTAIN VECTOR (0° STRAIGHT)"}
            </span>
          </div>
          <div className="evasion-telemetry-item">
            <span className="evasion-key">Ultrasonic Cycle:</span>
            <span className="evasion-val text-info">50ms Active Burst Loop</span>
          </div>
        </div>

        <div className="override-explanation-box">
          <div className="hardware-badge-row">
            <span className="chip-badge">ESP32 GPIO 18 (TRIG)</span>
            <span className="chip-badge">ESP32 GPIO 19 (ECHO)</span>
            <span className="chip-badge">L298N ENABLE CUTOFF</span>
            <span className="chip-badge">15 CM HARD THRESHOLD</span>
          </div>

          <p className="explanation-paragraph">
            To prevent internet and server latency from causing collisions, obstacle detection executes <strong>100% locally on the ESP32 microcontroller</strong>. The HC-SR04 emits 40kHz ultrasonic burst cycles every 50ms. If distance is &lt;15cm, the MCU halts propulsion instantly and calculates an evasive heading before permitting further motion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ObstacleStatus;
