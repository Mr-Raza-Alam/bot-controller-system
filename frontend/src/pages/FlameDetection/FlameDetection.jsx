import { useState, useEffect, useRef } from "react";
import {
  getFlameLive,
  getFlameLogs,
  updateFlameThreshold,
} from "../../services/api";
import { useSecurity } from "../../context/SecurityContext";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import "./FlameDetection.css";

const FlameDetection = () => {
  const { isArmed } = useSecurity();
  const [liveData, setLiveData] = useState({
    flameRaw: 4095,
    flameIntensity: 0,
    isFireDetected: false,
    threshold: 60,
    lastUpdated: null,
  });

  const [thresholdInput, setThresholdInput] = useState(60);
  const [incidents, setIncidents] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState("Idle");

  // web audio api context reference
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  // fetch latest live status from backend
  const fetchLiveStatus = async () => {
    const res = await getFlameLive();
    if (res.success && res.data) {
      setLiveData(res.data);
      setThresholdInput(res.data.threshold);

      // haptic feedback on fire detection
      if (res.data.isFireDetected && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  // fetch recent incidents from mongodb
  const fetchIncidents = async () => {
    const res = await getFlameLogs(10);
    if (res.success && res.data) {
      setIncidents(res.data);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    fetchIncidents();

    if (!isArmed) return; // In spectator mode, pause background loop
    const interval = setInterval(fetchLiveStatus, 1500);
    return () => clearInterval(interval);
  }, [isArmed]);

  // refresh incident logs whenever fire state changes
  useEffect(() => {
    if (liveData.isFireDetected) {
      fetchIncidents();
    }
  }, [liveData.isFireDetected]);

  // web audio siren synthesizer
  const startSiren = () => {
    if (isMuted) return;

    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      if (!oscillatorRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, ctx.currentTime);

        const now = ctx.currentTime;
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
      }
    } catch {
      // browser audio policy handled gracefully
    }
  };

  const stopSiren = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      }
    } catch {
      // ignore teardown error
    }
  };

  // audio playback lifecycle based on fire state and mute switch
  useEffect(() => {
    if (liveData.isFireDetected && !isMuted) {
      startSiren();
    } else {
      stopSiren();
    }

    return () => stopSiren();
  }, [liveData.isFireDetected, isMuted]);

  // handle threshold slider change
  const handleThresholdChange = async (newVal) => {
    const val = Number(newVal);
    setThresholdInput(val);
    setLiveData((prev) => ({ ...prev, threshold: val }));
    await updateFlameThreshold(val);
  };

  // on-demand force environment scan
  const handleScanEnvironment = async () => {
    setIsScanning(true);
    setScanFeedback("Sampling optical spectrum...");
    setTimeout(async () => {
      await fetchLiveStatus();
      setScanFeedback("Perimeter scan complete");
      setIsScanning(false);
    }, 1200);
  };

  const isFire = liveData.isFireDetected;

  return (
    <div className="flame-subsystem-container">
      {/* CARD 1: COMMAND & DYNAMIC RESPONSE BANNER */}
      <section className={`flame-hero-banner ${isFire ? "banner-hazard" : "banner-safe"}`}>
        <div className="banner-content">
          <div className="banner-tag-row">
            <span className="banner-label">OPTICAL PERIMETER SENSING</span>
            <span className="telemetry-live-pill">
              <span className="pulse-dot"></span>
              Hardware Sentry Active
            </span>
          </div>

          <h2 className="banner-headline">
            {isFire ? "CRITICAL: FIRE DETECTED" : "PERIMETER SECURE / IDLE"}
          </h2>

          <p className="banner-desc">
            {isFire
              ? "Flame radiation threshold exceeded. Hardware alert armed and browser audio siren engaged."
              : "Infrared emissions remain within normal ambient baseline. Hardware polling continuously."}
          </p>

          <div className="banner-scan-feedback">
            Status: <strong>{scanFeedback}</strong>
          </div>
        </div>

        <div className="banner-actions">
          <StatusBadge
            label={isFire ? "HAZARD ACTIVE" : "SECURE"}
            type={isFire ? "danger" : "safe"}
          />

          {isFire ? (
            <button
              className={`mute-btn ${isMuted ? "muted" : "unmuted"}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? "Siren Muted" : "Acknowledge / Mute Siren"}
            </button>
          ) : (
            <button
              className={`scan-env-btn ${isScanning ? "btn-scanning" : ""}`}
              onClick={handleScanEnvironment}
              disabled={isScanning}
            >
              {isScanning ? "Sampling IR Spectrum..." : "Scan Environment Now"}
            </button>
          )}
        </div>
      </section>

      {/* 2-COLUMN SIDE-BY-SIDE INTERACTIVE CALIBRATION & INTENSITY GRID */}
      <div className="flame-interactive-grid">
        {/* LEFT COLUMN (CARD 3): DYNAMIC SENSITIVITY CALIBRATION */}
        <section className="telemetry-card calibration-card">
          <div className="telemetry-card-header">
            <div className="card-title-group">
              <span className="module-tag">CALIBRATION</span>
              <h3>Dynamic Sensitivity Tuning</h3>
            </div>
            <span className="current-threshold-pill">Active: {thresholdInput}%</span>
          </div>

          <p className="section-instruction">
            Adjust the fire trigger threshold on the fly. As you move this slider, watch the trigger line on the right meter update in real time without reflashing the ESP32.
          </p>

          <div className="slider-container">
            <div className="slider-labels">
              <span>High Sensitivity (20%)</span>
              <span className="slider-center-val">{thresholdInput}%</span>
              <span>Low Sensitivity (90%)</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="1"
              value={thresholdInput}
              onChange={(e) => handleThresholdChange(e.target.value)}
              className="threshold-range-slider"
            />
          </div>

          <div className="calibration-presets-row">
            <span className="presets-label">Quick Presets:</span>
            <div className="presets-btn-group">
              <button
                className={`preset-btn ${thresholdInput === 35 ? "preset-active" : ""}`}
                onClick={() => handleThresholdChange(35)}
              >
                Sensitive (35%)
              </button>
              <button
                className={`preset-btn ${thresholdInput === 60 ? "preset-active" : ""}`}
                onClick={() => handleThresholdChange(60)}
              >
                Standard (60%)
              </button>
              <button
                className={`preset-btn ${thresholdInput === 80 ? "preset-active" : ""}`}
                onClick={() => handleThresholdChange(80)}
              >
                Hall Lights (80%)
              </button>
            </div>
          </div>

          <div className="calibration-note">
            Zeroes out ambient infrared noise from stage lighting, spotlights, and camera flashes.
          </div>
        </section>

        {/* RIGHT COLUMN (CARD 2): NORMALIZED FLAME INTENSITY GAUGE */}
        <section className={`telemetry-card intensity-gauge-card ${isFire ? "card-hazard-border" : ""}`}>
          <div className="telemetry-card-header">
            <div className="card-title-group">
              <span className="module-tag">REAL-TIME GAUGE</span>
              <h3>Normalized Flame Intensity</h3>
            </div>
            <span className="telemetry-tag">Normalized: 0 - 100%</span>
          </div>

          <div className="metric-display-group">
            <div className="main-percentage-box">
              <span className="intensity-number">{liveData.flameIntensity}</span>
              <span className="intensity-percent-sign">%</span>
            </div>

            <div className="raw-adc-reference">
              <span className="ref-label">Raw ESP32 ADC Reading:</span>
              <span className="ref-value">{liveData.flameRaw} ADC</span>
              <span className="ref-hint">(4095 = Dark Room, 0 = Point-Blank Fire)</span>
            </div>
          </div>

          {/* linear visual meter with dynamically moving threshold marker */}
          <div className="gauge-meter-track">
            <div
              className={`gauge-meter-fill ${isFire ? "fill-hazard" : "fill-safe"}`}
              style={{ width: `${Math.min(100, Math.max(3, liveData.flameIntensity))}%` }}
            ></div>
            <div
              className="threshold-marker-line"
              style={{ left: `${thresholdInput}%` }}
              title={`Trigger Threshold: ${thresholdInput}%`}
            >
              <span className="threshold-tag">TRIGGER: {thresholdInput}%</span>
            </div>
          </div>

          <div className="gauge-footer-info">
            <span>
              Trigger Level: <strong>{thresholdInput}%</strong> ({isFire ? "EXCEEDED" : "NORMAL"})
            </span>
            {liveData.lastUpdated && (
              <span>Last Telemetry Sync: {new Date(liveData.lastUpdated).toLocaleTimeString()}</span>
            )}
          </div>
        </section>
      </div>

      {/* CARD 4: PERSISTENT FIRE INCIDENT LOG (Full Width Bottom) */}
      <section className="telemetry-card incident-log-card">
        <div className="telemetry-card-header">
          <div className="card-title-group">
            <span className="module-tag">MONGODB ATLAS</span>
            <h3>Persistent Fire Incident Log</h3>
          </div>
          <span className="telemetry-tag">
            {incidents.length} Incident{incidents.length === 1 ? "" : "s"} Recorded
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="empty-incidents-msg">
            No fire incidents recorded in database. System running securely.
          </div>
        ) : (
          <div className="incidents-table-wrapper">
            <div className="incidents-table">
              <div className="incidents-table-head">
                <span>Timestamp</span>
                <span>Peak Intensity</span>
                <span>Raw ADC</span>
                <span>Threshold at Trigger</span>
                <span>Incident Status</span>
              </div>
              {incidents.map((item) => (
                <div key={item._id} className="incidents-table-row">
                  <span className="col-time">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="col-intensity">
                    <strong>{item.peakIntensity}%</strong>
                  </span>
                  <span className="col-raw">{item.flameRaw} ADC</span>
                  <span className="col-thresh">{item.thresholdAtTrigger}%</span>
                  <span className="col-badge">
                    <span className="incident-alert-pill">{item.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default FlameDetection;
