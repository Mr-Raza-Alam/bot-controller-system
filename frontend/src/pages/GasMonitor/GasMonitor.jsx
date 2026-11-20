import { useState, useEffect, useRef } from "react";
import {
  getGasLive,
  calibrateGasBaseline,
  getGasLogs,
} from "../../services/api";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import "./GasMonitor.css";

const GasMonitor = () => {
  const [gasData, setGasData] = useState({
    gasRaw: 600,
    gasDelta: 0,
    status: "SAFE",
    baseline: 600,
    isWarmingUp: false,
    warmupRemaining: 0,
    lastUpdated: null,
  });

  const [incidents, setIncidents] = useState([]);
  const [trendHistory, setTrendHistory] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHazardDismissed, setIsHazardDismissed] = useState(false);

  // web audio context reference for hazard alarm
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);

  // fetch live telemetry
  const fetchTelemetry = async () => {
    const res = await getGasLive();
    if (res.success && res.data) {
      setGasData(res.data);

      // update rolling trend history (last 12 samples)
      setTrendHistory((prev) => {
        const next = [...prev.slice(1), res.data.gasDelta];
        return next;
      });

      // haptic feedback on hazardous gas leak
      if (res.data.status === "HAZARDOUS" && navigator.vibrate) {
        navigator.vibrate([150, 100, 150]);
      }
    }
  };

  // fetch persistent incidents from mongodb
  const fetchIncidents = async () => {
    const res = await getGasLogs(10);
    if (res.success && res.data) {
      setIncidents(res.data);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetchIncidents();

    const interval = setInterval(fetchTelemetry, 1500);
    return () => clearInterval(interval);
  }, []);

  // auto refresh incidents when status hits hazardous
  useEffect(() => {
    if (gasData.status === "HAZARDOUS") {
      fetchIncidents();
      setIsHazardDismissed(false); // surface alert on fresh trigger
    }
  }, [gasData.status]);

  // web audio alarm synthesizer
  const startAlarm = () => {
    if (isMuted) return;

    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      if (!oscRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(650, ctx.currentTime);

        const now = ctx.currentTime;
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.5);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscRef.current = osc;
      }
    } catch {
      // browser audio policy handled gracefully
    }
  };

  const stopAlarm = () => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
    } catch {
      // ignore teardown error
    }
  };

  // alarm audio lifecycle
  useEffect(() => {
    if (gasData.status === "HAZARDOUS" && !isMuted) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [gasData.status, isMuted]);

  // handle room air baseline calibration
  const handleCalibrate = async () => {
    setIsCalibrating(true);
    await calibrateGasBaseline();
    await fetchTelemetry();
    setTimeout(() => {
      setIsCalibrating(false);
    }, 800);
  };

  const isSafe = gasData.status === "SAFE";
  const isModerate = gasData.status === "MODERATE";
  const isHazardous = gasData.status === "HAZARDOUS";

  const deltaPercent = Math.min(100, Math.max(3, (gasData.gasDelta / 800) * 100));

  return (
    <div className="air-safety-container">
      
      {/* CARD 4: TOP HERO DISPLAY - LIVE GAS SPIKE TREND & WAVEFORM */}
      <section className="telemetry-card waveform-hero-card">
        <div className="telemetry-card-header">
          <div className="card-title-group">
            <span className="module-tag">ATMOSPHERIC MONITOR</span>
            <h3>Live Gas Spike Trend &amp; Real-Time Waveform</h3>
          </div>

          <div className="header-status-pill">
            {gasData.isWarmingUp ? (
              <span className="warmup-badge">
                Sensor coil stabilizing ({gasData.warmupRemaining}s remaining)
              </span>
            ) : (
              <span className="telemetry-live-pill">
                <span className="pulse-dot"></span>
                Hardware Sentry Active
              </span>
            )}
          </div>
        </div>

        <div className="waveform-meta-row">
          <span className="waveform-desc">
            Continuous 12-sample rolling air telemetry from onboard MQ-2 electrochemical sensor.
          </span>
          <span className="live-delta-tag">
            Current Spike: <strong>+{gasData.gasDelta} ADC</strong>
          </span>
        </div>

        {/* 12-sample sparkline bars */}
        <div className="sparkline-wrapper">
          <div className="sparkline-bars">
            {trendHistory.map((val, idx) => {
              const barHeight = Math.min(100, Math.max(8, Math.round((val / 600) * 100)));
              const barClass =
                val > 500 ? "bar-danger" : val >= 250 ? "bar-warning" : "bar-safe";

              return (
                <div key={idx} className="sparkline-col">
                  <div
                    className={`sparkline-bar ${barClass}`}
                    style={{ height: `${barHeight}%` }}
                    title={`Delta: +${val} ADC`}
                  ></div>
                  <span className="bar-val-label">{val > 0 ? `+${val}` : "0"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="sparkline-hint">
          Watch this waveform rise dynamically in real time when an incense stick or unlit lighter is brought near the robot.
        </p>
      </section>

      {/* 2-COLUMN SIDE-BY-SIDE INTERACTIVE CALIBRATION & RELATIVE DELTA GRID */}
      <div className="air-interactive-grid">
        
        {/* LEFT COLUMN (CARD 3): ROOM BASELINE CALIBRATION */}
        <section className="telemetry-card calibration-card">
          <div className="telemetry-card-header">
            <div className="card-title-group">
              <span className="module-tag">CALIBRATION</span>
              <h3>Room Baseline Calibration</h3>
            </div>
            <span className="current-baseline-tag">
              Baseline: <strong>{gasData.baseline} ADC</strong>
            </span>
          </div>

          <p className="section-instruction">
            Every room has a different background air quality. Tap below during pre-testing to calibrate against the exhibition hall air. Watch the delta on the right meter reset to +0 ADC in real time!
          </p>

          <div className="calibration-action-box">
            <button
              className={`calibrate-btn ${isCalibrating ? "btn-calibrating" : ""}`}
              onClick={handleCalibrate}
              disabled={isCalibrating}
            >
              {isCalibrating ? "Calibrating Baseline..." : "Calibrate Room Air Now"}
            </button>
            <span className="calibration-feedback">
              {isCalibrating ? "Persisting new zero-point to MongoDB..." : "Zero-point active in database"}
            </span>
          </div>

          <div className="calibration-note">
            Prevents false alarms caused by crowded halls, ambient humidity, and temperature variations.
          </div>
        </section>

        {/* RIGHT COLUMN (CARD 2): RELATIVE AIR QUALITY DELTA METER */}
        <section className={`telemetry-card delta-meter-card ${isHazardous ? "card-hazard-border" : ""}`}>
          <div className="telemetry-card-header">
            <div className="card-title-group">
              <span className="module-tag">REAL-TIME DELTA</span>
              <h3>Relative Air Quality Delta</h3>
            </div>
            <StatusBadge
              label={
                isHazardous
                  ? "HAZARD: LEAK"
                  : isModerate
                  ? "WARNING: SMOKE"
                  : "AIR SECURE"
              }
              type={isHazardous ? "danger" : isModerate ? "warning" : "safe"}
            />
          </div>

          <div className="metric-display-group">
            <div className="main-percentage-box">
              <span className="intensity-number">+{gasData.gasDelta}</span>
              <span className="intensity-unit-sign">ADC DELTA</span>
            </div>

            <div className="raw-adc-reference">
              <span className="ref-label">Raw MQ-2 Voltage:</span>
              <span className="ref-value">{gasData.gasRaw} ADC</span>
              <span className="ref-hint">Calibrated Baseline: {gasData.baseline} ADC</span>
            </div>
          </div>

          {/* 3-tier segmented meter track */}
          <div className="delta-meter-track">
            <div
              className={`delta-meter-fill ${
                isHazardous ? "fill-hazardous" : isModerate ? "fill-moderate" : "fill-safe"
              }`}
              style={{ width: `${Math.max(3, deltaPercent)}%` }}
            ></div>

            {/* threshold divider lines */}
            <div className="threshold-tier-marker marker-moderate" title="Moderate Threshold (250 Delta)">
              <span className="tier-tag">250 (SMOKE)</span>
            </div>
            <div className="threshold-tier-marker marker-hazardous" title="Hazardous Threshold (500 Delta)">
              <span className="tier-tag">500 (LEAK)</span>
            </div>
          </div>

          <div className="meter-legend-row">
            <span className="legend-item safe-leg">0 - 249: Safe Air</span>
            <span className="legend-item warn-leg">250 - 500: Smoke / Fumes</span>
            <span className="legend-item danger-leg">500+: Gas Leak</span>
          </div>
        </section>
      </div>

      {/* CARD 5: PERSISTENT GAS INCIDENT LOG (Full Width Bottom) */}
      <section className="telemetry-card incident-log-card">
        <div className="telemetry-card-header">
          <div className="card-title-group">
            <span className="module-tag">MONGODB ATLAS</span>
            <h3>Persistent Gas Incident Log</h3>
          </div>
          <span className="telemetry-tag">
            {incidents.length} Incident{incidents.length === 1 ? "" : "s"} Recorded
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="empty-incidents-msg">
            No hazardous gas leak incidents recorded in database. Air quality secure.
          </div>
        ) : (
          <div className="incidents-table-wrapper">
            <div className="incidents-table">
              <div className="incidents-table-head">
                <span>Timestamp</span>
                <span>Spike Delta</span>
                <span>Peak Raw ADC</span>
                <span>Baseline at Trigger</span>
                <span>Incident Status</span>
              </div>
              {incidents.map((item) => (
                <div key={item._id} className="incidents-table-row">
                  <span className="col-time">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="col-intensity">
                    <strong>+{item.gasDelta} ADC</strong>
                  </span>
                  <span className="col-raw">{item.peakRaw} ADC</span>
                  <span className="col-thresh">{item.baselineAtTrigger} ADC</span>
                  <span className="col-badge">
                    <span className="incident-alert-pill">{item.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* EMERGENCY POPUP MODAL: APPEARS ONLY ON CRITICAL HAZARD TRIGGER */}
      {isHazardous && !isHazardDismissed && (
        <div className="gas-emergency-modal-backdrop">
          <div className="gas-emergency-modal-card">
            <div className="emergency-modal-header">
              <span className="emergency-badge">CRITICAL HAZARD TRIGGER</span>
              <button
                className="close-emergency-btn"
                onClick={() => setIsHazardDismissed(true)}
              >
                Dismiss
              </button>
            </div>

            <div className="emergency-modal-body">
              <h2 className="emergency-headline">GAS LEAK DETECTED - HAZARDOUS</h2>
              <p className="emergency-desc">
                Atmospheric spike of <strong>+{gasData.gasDelta} ADC Delta</strong> exceeds the safety threshold. Combustible gas traces or dense fumes detected in perimeter.
              </p>

              <div className="emergency-metrics-strip">
                <div className="strip-item">
                  <span className="strip-label">Raw MQ-2 Reading:</span>
                  <strong className="strip-val">{gasData.gasRaw} ADC</strong>
                </div>
                <div className="strip-item">
                  <span className="strip-label">Room Baseline:</span>
                  <strong className="strip-val">{gasData.baseline} ADC</strong>
                </div>
                <div className="strip-item">
                  <span className="strip-label">Status:</span>
                  <strong className="strip-val text-hazard">HAZARDOUS SPIKE</strong>
                </div>
              </div>
            </div>

            <div className="emergency-modal-actions">
              <button
                className={`mute-btn ${isMuted ? "muted" : "unmuted"}`}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? "Alarm Siren Muted" : "Acknowledge / Mute Siren"}
              </button>
              <button
                className="dismiss-btn"
                onClick={() => setIsHazardDismissed(true)}
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GasMonitor;
