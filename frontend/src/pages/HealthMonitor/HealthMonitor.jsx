import { useState, useEffect } from "react";
import {
  getVitalsLive,
  saveVitalCheckup,
  getVitalsLogs,
} from "../../services/api";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import "./HealthMonitor.css";

const HealthMonitor = () => {
  // active inspection mode: "BOTH", "HEART_RATE", or "BODY_TEMP"
  const [activeMode, setActiveMode] = useState("BOTH");

  const [liveData, setLiveData] = useState({
    heartRate: 0,
    bodyTempC: 36.6,
    bodyTempF: 97.9,
    fingerDetected: false,
    heartStatus: "NO_PULSE",
    tempStatus: "NORMAL",
    lastUpdated: null,
  });

  const [records, setRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(null); // null | "HEART_RATE" | "BODY_TEMP" | "BOTH"
  const [saveFeedback, setSaveFeedback] = useState(null);

  // fetch live telemetry
  const fetchTelemetry = async () => {
    const res = await getVitalsLive();
    if (res.success && res.data) {
      setLiveData(res.data);
    }
  };

  // fetch saved records from mongodb
  const fetchRecords = async () => {
    const res = await getVitalsLogs(10);
    if (res.success && res.data) {
      setRecords(res.data);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetchRecords();

    const interval = setInterval(fetchTelemetry, 1500);
    return () => clearInterval(interval);
  }, []);

  // save clean checkup record to mongodb
  const handleSaveCheckup = async (modeToSave = activeMode) => {
    setIsSaving(modeToSave);
    setSaveFeedback(null);
    const res = await saveVitalCheckup(modeToSave);
    if (res.success) {
      setSaveFeedback(
        modeToSave === "BOTH"
          ? "Complete vital scan saved to MongoDB"
          : modeToSave === "HEART_RATE"
          ? "Heart rate record saved to MongoDB"
          : "Temperature record saved to MongoDB"
      );
      fetchRecords();
    } else {
      setSaveFeedback("Failed to save checkup record");
    }
    setTimeout(() => {
      setIsSaving(null);
      setTimeout(() => setSaveFeedback(null), 3000);
    }, 600);
  };

  // status helpers
  const getHeartStatusBadge = (status) => {
    switch (status) {
      case "CRITICAL": return { label: "CRITICAL ALERT", type: "danger" };
      case "ELEVATED": return { label: "ELEVATED / FATIGUE", type: "warning" };
      case "NORMAL": return { label: "NORMAL RHYTHM", type: "safe" };
      default: return { label: "NO PULSE DETECTED", type: "info" };
    }
  };

  const getTempStatusBadge = (status) => {
    switch (status) {
      case "HIGH_FEVER": return { label: "HIGH FEVER ALERT", type: "danger" };
      case "MILD_FEVER": return { label: "MILD FEVER DETECTED", type: "warning" };
      case "BELOW_AVG": return { label: "BELOW AVERAGE", type: "info" };
      default: return { label: "NORMAL BODY TEMP", type: "safe" };
    }
  };

  const heartBadge = getHeartStatusBadge(liveData.heartStatus);
  const tempBadge = getTempStatusBadge(liveData.tempStatus);

  // render heart rate card content
  const renderHeartRateCard = (showIndividualSave = false) => (
    <div className="telemetry-card vital-focus-card">
      <div className="telemetry-card-header">
        <div className="card-title-group">
          <span className="telemetry-tag">MAX30102 PPG</span>
          <h3>Cardiac Pulse Rate</h3>
        </div>

        <div className="header-badge-action-group">
          <StatusBadge label={heartBadge.label} type={heartBadge.type} />
          {showIndividualSave && (
            <button
              className={`compact-save-btn ${isSaving === "HEART_RATE" ? "btn-saving" : ""}`}
              onClick={() => handleSaveCheckup("HEART_RATE")}
              disabled={isSaving !== null}
            >
              {isSaving === "HEART_RATE" ? "Saving..." : "Save Record"}
            </button>
          )}
        </div>
      </div>

      <div className="vital-main-readout">
        <span className="vital-large-number">
          {liveData.fingerDetected ? liveData.heartRate : "--"}
        </span>
        <span className="vital-unit-text">BPM</span>
      </div>

      <div className="finger-contact-status">
        <span
          className={`contact-dot ${liveData.fingerDetected ? "contact-locked" : "contact-waiting"}`}
        ></span>
        <span className="contact-text">
          {liveData.fingerDetected
            ? "Optical pulse wave locked"
            : "Place finger firmly on MAX30102 sensor"}
        </span>
      </div>

      <div className="scale-reference-box">
        <div className="ref-item">
          <span>60 - 100 BPM</span>
          <strong className="safe-text">Normal Resting</strong>
        </div>
        <div className="ref-item">
          <span>101 - 125 BPM</span>
          <strong className="warn-text">Elevated / Fatigue</strong>
        </div>
        <div className="ref-item">
          <span>&gt;125 BPM</span>
          <strong className="danger-text">Critical Tachycardia</strong>
        </div>
      </div>
    </div>
  );

  // render body temperature card content
  const renderBodyTempCard = (showIndividualSave = false) => (
    <div className="telemetry-card vital-focus-card">
      <div className="telemetry-card-header">
        <div className="card-title-group">
          <span className="telemetry-tag">I2C THERMAL DIE</span>
          <h3>Body Temperature</h3>
        </div>

        <div className="header-badge-action-group">
          <StatusBadge label={tempBadge.label} type={tempBadge.type} />
          {showIndividualSave && (
            <button
              className={`compact-save-btn ${isSaving === "BODY_TEMP" ? "btn-saving" : ""}`}
              onClick={() => handleSaveCheckup("BODY_TEMP")}
              disabled={isSaving !== null}
            >
              {isSaving === "BODY_TEMP" ? "Saving..." : "Save Record"}
            </button>
          )}
        </div>
      </div>

      <div className="vital-main-readout">
        <span className="vital-large-number">{liveData.bodyTempC || "--"}</span>
        <span className="vital-unit-text">°C</span>
        <span className="fahrenheit-secondary">({liveData.bodyTempF || "--"} °F)</span>
      </div>

      <div className="temp-bar-track">
        <div
          className={`temp-bar-fill ${
            liveData.tempStatus === "HIGH_FEVER"
              ? "temp-danger"
              : liveData.tempStatus === "MILD_FEVER"
              ? "temp-warning"
              : "temp-normal"
          }`}
          style={{
            width: `${Math.min(
              100,
              Math.max(10, (((liveData.bodyTempC || 36) - 34) / 7) * 100)
            )}%`,
          }}
        ></div>
      </div>

      <div className="scale-reference-box">
        <div className="ref-item">
          <span>36.1 - 37.2 °C</span>
          <strong className="safe-text">Normal Baseline</strong>
        </div>
        <div className="ref-item">
          <span>37.3 - 38.5 °C</span>
          <strong className="warn-text">Mild Fever</strong>
        </div>
        <div className="ref-item">
          <span>&gt;38.5 °C</span>
          <strong className="danger-text">High Fever Alert</strong>
        </div>
      </div>
    </div>
  );

  return (
    <div className="vitals-subsystem-container">
      {/* 3-mode selector toolbar */}
      <div className="mode-selector-card">
        <span className="mode-selector-label">SELECT INSPECTION MODE</span>
        <div className="mode-btn-group">
          <button
            className={`mode-btn ${activeMode === "HEART_RATE" ? "active-mode" : ""}`}
            onClick={() => setActiveMode("HEART_RATE")}
          >
            HEART RATE ONLY
          </button>
          <button
            className={`mode-btn ${activeMode === "BODY_TEMP" ? "active-mode" : ""}`}
            onClick={() => setActiveMode("BODY_TEMP")}
          >
            BODY TEMP ONLY
          </button>
          <button
            className={`mode-btn ${activeMode === "BOTH" ? "active-mode" : ""}`}
            onClick={() => setActiveMode("BOTH")}
          >
            FULL VITAL SCAN (BOTH)
          </button>
        </div>
      </div>

      {/* VIEW 1: HEART RATE ONLY */}
      {activeMode === "HEART_RATE" && renderHeartRateCard(true)}

      {/* VIEW 2: BODY TEMP ONLY */}
      {activeMode === "BODY_TEMP" && renderBodyTempCard(true)}

      {/* VIEW 3: FULL VITAL SCAN (BOTH) STORED UNDER A COMMON CONTAINER */}
      {activeMode === "BOTH" && (
        <section className="common-vital-container">
          <div className="common-container-header">
            <div className="container-title-group">
              <span className="module-tag">FULL SCAN SUITE</span>
              <h3>Dual Physiological Screening</h3>
            </div>

            {/* save record button placed cleanly at container's top right corner */}
            <button
              className={`common-container-save-btn ${isSaving === "BOTH" ? "btn-saving" : ""}`}
              onClick={() => handleSaveCheckup("BOTH")}
              disabled={isSaving !== null}
            >
              {isSaving === "BOTH" ? "Persisting Record..." : "Save Record"}
            </button>
          </div>

          <div className="vitals-dual-grid">
            {renderHeartRateCard(false)}
            {renderBodyTempCard(false)}
          </div>
        </section>
      )}

      {/* inline save confirmation feedback */}
      {saveFeedback && <div className="save-confirm-alert">{saveFeedback}</div>}

      {/* persistent triage checkups log from mongodb */}
      <section className="telemetry-card incident-log-card">
        <div className="telemetry-card-header">
          <div className="card-title-group">
            <span className="module-tag">MONGODB ATLAS</span>
            <h3>Persistent Medical Checkup History</h3>
          </div>
          <span className="telemetry-tag">
            {records.length} Record{records.length === 1 ? "" : "s"} Saved
          </span>
        </div>

        {records.length === 0 ? (
          <div className="empty-records-msg">
            No checkup snapshots saved in database yet. Tap "Save Record" on any card above to log.
          </div>
        ) : (
          <div className="vitals-table-wrapper">
            <div className="vitals-table">
              <div className="vitals-table-head">
                <span>Timestamp</span>
                <span>Triage Mode</span>
                <span>Pulse Rate</span>
                <span>Body Temperature</span>
                <span>Clinical Status</span>
              </div>
              {records.map((item) => (
                <div key={item._id} className="vitals-table-row">
                  <span className="col-time">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="col-type-tag">{item.checkType}</span>
                  <span className="col-pulse">
                    {item.heartRate ? `${item.heartRate} BPM` : "--"}
                  </span>
                  <span className="col-temp">
                    {item.bodyTempC ? `${item.bodyTempC} °C (${item.bodyTempF} °F)` : "--"}
                  </span>
                  <span className="col-status-pill">
                    {item.checkType === "BODY_TEMP"
                      ? item.tempStatus
                      : item.checkType === "HEART_RATE"
                      ? item.heartStatus
                      : `${item.heartStatus} / ${item.tempStatus}`}
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

export default HealthMonitor;
