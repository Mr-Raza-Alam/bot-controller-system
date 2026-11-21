import { useState } from "react";
import "./PilotManual.css";

const PilotManual = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("CONTROLS");

  return (
    <div className="pilot-manual-container">
      {/* manual tab navigation */}
      <nav className="manual-nav-tabs">
        <button
          className={`manual-tab-btn ${activeTab === "CONTROLS" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("CONTROLS")}
        >
          1. Controls &amp; D-Pad
        </button>
        <button
          className={`manual-tab-btn ${activeTab === "SECURITY" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("SECURITY")}
        >
          2. Security Interlock
        </button>
        <button
          className={`manual-tab-btn ${activeTab === "VOICE" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("VOICE")}
        >
          3. Voice Lexicon
        </button>
        <button
          className={`manual-tab-btn ${activeTab === "RADAR" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("RADAR")}
        >
          4. Radar &amp; Failsafe
        </button>
        <button
          className={`manual-tab-btn ${activeTab === "SENSORS" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("SENSORS")}
        >
          5. Sensors &amp; Calibration
        </button>
      </nav>

      {/* tab 1: controls & d-pad */}
      {activeTab === "CONTROLS" && (
        <section className="manual-section-content">
          <div className="manual-section-header">
            <h4>D-Pad Directional Drive &amp; Dead-Man Protocol</h4>
            <span className="manual-pill">L298N DUAL H-BRIDGE</span>
          </div>

          <p className="manual-lead-text">
            Like a dedicated handheld gaming console or flight controller, the virtual station commands the rover tracks via a 9-slot touch grid. Motors only spin while direct physical or touch contact is maintained.
          </p>

          <div className="schematic-box">
            <div className="schematic-title">VIRTUAL CONTROLLER D-PAD SCHEMATIC</div>
            <pre className="schematic-art">
{`                  [ FORWARD (▲) ]
               GPIO 26 | Key: W / Up
                         │
      [ PIVOT L (◄) ] ───┼─── [ PIVOT R (►) ]
    GPIO 27 | Key: A     │     GPIO 14 | Key: D
                         │
                  [ REVERSE (▼) ]
              GPIO 12 | Key: X / Down
              
                  [ CENTER: BRAKE (■) ]
                  Instant Motors Halt`}
            </pre>
          </div>

          <div className="manual-rules-grid">
            <div className="manual-rule-card">
              <h5>Dead-Man Safety Protocol</h5>
              <p>
                Releasing your mouse or lifting your finger off any drive button immediately sends an autonomous <code>STOP</code> payload, preventing runaway robot movement.
              </p>
            </div>
            <div className="manual-rule-card">
              <h5>Zero-Radius Pivot Turns</h5>
              <p>
                Pressing Left or Right engages counter-rotation (one side forward, one side backward) for instant, in-place 360-degree pivoting.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* tab 2: security interlock */}
      {activeTab === "SECURITY" && (
        <section className="manual-section-content">
          <div className="manual-section-header">
            <h4>Commander Security &amp; Arming Interlock</h4>
            <span className="manual-pill pill-warning">RBAC SAFETY GATE</span>
          </div>

          <p className="manual-lead-text">
            To prevent unauthorized touch commands during public exhibitions or showcases, the station defaults to a tamper-proof Spectator Mode.
          </p>

          <div className="schematic-box">
            <div className="schematic-title">STATION STATE TRANSITION WORKFLOW</div>
            <pre className="schematic-art">
{`   [ SPECTATOR MODE ]  ════( Enter PIN: 2327 )════►  [ ARMED MODE ]
   • Read-only visual inspection                     • Full D-Pad drive unlocked
   • Drive buttons disabled                          • Voice commander operational
   • 0 network background traffic                    • 1500ms real-time telemetry`}
            </pre>
          </div>

          <div className="manual-callout-box">
            <strong>Commander PIN:</strong> <code>2327</code>
            <p>
              Click the Lock badge in the top navigation bar, enter the 4-digit code, and confirm to arm the console. Click the badge again at any time to instantly lock the controls.
            </p>
          </div>
        </section>
      )}

      {/* tab 3: voice lexicon */}
      {activeTab === "VOICE" && (
        <section className="manual-section-content">
          <div className="manual-section-header">
            <h4>Bilingual Voice Commander Lexicon</h4>
            <span className="manual-pill">SPEECH RECOGNITION (EN-IN)</span>
          </div>

          <p className="manual-lead-text">
            The virtual controller supports real-time bilingual voice dispatch in English and Hindi. Click <code>[Voice Pilot]</code> and speak into your microphone.
          </p>

          <table className="manual-data-table">
            <thead>
              <tr>
                <th>Robot Vector</th>
                <th>English Commands</th>
                <th>Hindi Commands</th>
                <th>Safety Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Forward (▲)</strong></td>
                <td>&quot;forward&quot;, &quot;go&quot;, &quot;ahead&quot;</td>
                <td>&quot;aage&quot;, &quot;chalo&quot;</td>
                <td>Timed burst drive + auto brake</td>
              </tr>
              <tr>
                <td><strong>Reverse (▼)</strong></td>
                <td>&quot;back&quot;, &quot;reverse&quot;</td>
                <td>&quot;peeche&quot;, &quot;peeche lo&quot;</td>
                <td>Controlled reverse maneuver</td>
              </tr>
              <tr>
                <td><strong>Pivot Left (◄)</strong></td>
                <td>&quot;left&quot;, &quot;turn left&quot;</td>
                <td>&quot;baye&quot;, &quot;baye ghumo&quot;</td>
                <td>Zero-radius left spin</td>
              </tr>
              <tr>
                <td><strong>Pivot Right (►)</strong></td>
                <td>&quot;right&quot;, &quot;turn right&quot;</td>
                <td>&quot;daye&quot;, &quot;daye ghumo&quot;</td>
                <td>Zero-radius right spin</td>
              </tr>
              <tr>
                <td><strong>Emergency Halt (■)</strong></td>
                <td>&quot;stop&quot;, &quot;halt&quot;, &quot;break&quot;</td>
                <td>&quot;ruko&quot;, &quot;ruk jao&quot;</td>
                <td>Immediate hardware motor kill</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* tab 4: radar & failsafe */}
      {activeTab === "RADAR" && (
        <section className="manual-section-content">
          <div className="manual-section-header">
            <h4>Obstacle Radar &amp; 15cm Hardware Brake</h4>
            <span className="manual-pill pill-danger">ZERO-LATENCY FAILSAFE</span>
          </div>

          <p className="manual-lead-text">
            Front clearance is measured by an HC-SR04 ultrasonic sonar sensor operating at 40 kHz. Three proximity zones govern safety:
          </p>

          <div className="radar-zone-diagram">
            <div className="radar-zone zone-critical">
              <span className="zone-range">&lt; 15 cm</span>
              <span className="zone-name">ZONE 3: CRITICAL LOCKOUT</span>
              <span className="zone-action">Motors cut off locally on ESP32 in &lt;2ms (Hardware Failsafe)</span>
            </div>
            <div className="radar-zone zone-caution">
              <span className="zone-range">15 cm &ndash; 50 cm</span>
              <span className="zone-name">ZONE 2: CAUTION PROXIMITY</span>
              <span className="zone-action">Pilot visual warning engaged; motors operational</span>
            </div>
            <div className="radar-zone zone-safe">
              <span className="zone-range">&gt; 50 cm</span>
              <span className="zone-name">ZONE 1: CLEAR PATHWAY</span>
              <span className="zone-action">Nominal cruise clearance</span>
            </div>
          </div>

          <div className="manual-callout-box">
            <strong>Decoupled Edge Defense:</strong> If the robot approaches an obstacle closer than 15 cm, the ESP32 cuts motor pins locally without waiting for internet cloud round-trips.
          </div>
        </section>
      )}

      {/* tab 5: sensors & calibration */}
      {activeTab === "SENSORS" && (
        <section className="manual-section-content">
          <div className="manual-section-header">
            <h4>Sensor Subsystems Calibration &amp; Thresholds</h4>
            <span className="manual-pill">ONBOARD TELEMETRY SUITE</span>
          </div>

          <div className="sensors-spec-list">
            <div className="sensor-spec-item">
              <div className="spec-badge">FLAME SENSOR (IR OPTICAL)</div>
              <p>
                Monitors 760nm&ndash;1100nm infrared spectrum. Safe raw ADC: <code>3800&ndash;4095</code> (0% intensity). Fire alert triggers if intensity exceeds <strong>60%</strong>, engaging the onboard rover buzzer.
              </p>
            </div>

            <div className="sensor-spec-item">
              <div className="spec-badge">MQ-2 AIR &amp; GAS DETECTOR</div>
              <p>
                Heater requires 20s initial stabilization on boot. Uses dynamic baseline math: <code>&Delta;Gas = Raw - Baseline</code>. Normal: &Delta;&lt;150, Moderate: 150&ndash;400, Hazardous: &Delta;&ge;400.
              </p>
            </div>

            <div className="sensor-spec-item">
              <div className="spec-badge">HEALTH &amp; BIOMETRIC STATION</div>
              <p>
                <strong>MAX30102:</strong> Measures arterial pulse (60&ndash;100 BPM nominal). Place index finger on the sensor glass.<br />
                <strong>MLX90614:</strong> Non-contact surface temperature. Triage alert triggers if reading exceeds <strong>38.0&deg;C (100.4&deg;F)</strong>.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* manual footer download note */}
      <div className="manual-footer-bar">
        <span>Complete documentation available in repository at <code>MANUAL.md</code></span>
        <button className="manual-close-action-btn" onClick={onClose}>
          Exit Manual
        </button>
      </div>
    </div>
  );
};

export default PilotManual;