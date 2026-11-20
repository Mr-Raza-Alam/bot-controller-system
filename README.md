# Multi-Purpose Bot Assistant: Virtual Controller & Telemetry Station

A production-ready, full-stack, decoupled IoT command center and real-time telemetry dashboard designed for autonomous and semi-autonomous robotic operations. Built with Node.js, Express, MongoDB Atlas, and React (Vite), communicating with an ESP32 microcontroller edge node.

---

## 1. System Definition

The **Virtual Controller & Telemetry Station** is a browser-based mission control station that replaces traditional, range-limited physical radio-frequency (RF) or infrared (IR) remotes. 

It establishes a two-way decoupled IoT architecture:
- **Upstream Telemetry**: The robot microcontroller (ESP32) gathers real-time physical environmental and physiological data (obstacle proximity, flame intensity, air quality, pulse, body temperature) and pushes it to an Express/MongoDB backend via HTTP REST endpoints.
- **Downstream Command Control**: The operator issues directional driving commands (touch D-Pad, keyboard, or voice instructions) and system configuration updates (sensitivity sliders, sensor calibration) from any web browser or smartphone on the local network or internet.

By decoupling the controller from dedicated hardware, the system enables remote piloting, live sensor visualization, auditable incident logging, and automated safety overrides.

---

## 2. System Objective

Traditional robotics projects often rely on physical joysticks or simple Bluetooth serial terminals. These approaches have major limitations:
- **No Long-Range Persistence**: Telemetry is lost once the signal drops or the terminal window closes.
- **Zero Sensor Auditability**: Hazardous spikes (gas leaks, fire events) cannot be recorded, timestamped, or reviewed after an incident.
- **Fragile Latency Dependencies**: When navigation controls depend purely on cloud connectivity, a high-latency connection can cause physical collisions.
- **Vulnerable to Public Hijacking**: Cloud-deployed robotics interfaces without authorization can be tampered with by unauthorized visitors.

The objectives of this Virtual Controller system are:
1. **Decoupled Edge Safety**: Ensure critical safety operations (such as emergency obstacle braking) run 100% locally on the microcontroller, while non-latency-critical telemetry and logging are offloaded to the cloud/server.
2. **Unified Operator Cockpit**: Present all navigation controls and multi-sensor feeds on a single, high-contrast, responsive interface suitable for desktop monitors and mobile touchscreens.
3. **Cyber-Physical Security Interlock (RBAC)**: Enforce Spectator vs. Armed Commander access, safeguarding the physical robot against unauthorized commandeering over the public internet.
4. **Dynamic Operational Tuning**: Allow operators to calibrate sensor baselines and adjust alert thresholds on the fly without reflashing the robot firmware.
5. **Permanent Incident Logging**: Store real-world hazard events (fire spikes, toxic gas concentrations, patient triage vitals) in a MongoDB Atlas database for post-mission inspection and review.

---

## 3. Subsystem Functionalities & Explanations

### Subsystem 1: Smart Navigation (Drive Control)
- **What It Is**: A dual-mode locomotion control system supporting both directional manual piloting and autonomous roaming.
- **Purpose**: Gives the operator direct physical control over motor propulsion while providing hands-free voice control and autonomous exploration capabilities.
- **Features**:
  - **Press-and-Hold Manual D-Pad**: Drive the robot Forward, Backward, Turn Left, or Turn Right using dead-man touch/pointer events (`onPointerDown` / `onPointerUp`). Releasing halts the bot automatically.
  - **0ms Optimistic Audit Trail**: Dispatched directional commands slide immediately into the Command Trail panel with zero network lag while persisting to MongoDB Atlas in the background.
  - **Emergency Stop Priority**: Central high-priority override button immediately halting motor power and reverting autonomous roaming back to manual mode.
  - **Bilingual Voice Commander**: Voice recognition supporting English and Hindi commands (*Forward / Aage*, *Backward / Peeche*, *Left / Baaye*, *Right / Daaye*, *Stop / Ruko*).
  - **Audit Trail Purge**: Dedicated tool to sweep and clear current navigation logs on demand.

---

### Subsystem 2: Commander Security Interlock (RBAC)
- **What It Is**: Role-based access control protecting cloud-connected robot actuation from unauthorized public internet users.
- **Purpose**: Allows public spectators to safely review architecture and sensor reports while reserving motor commands for the authorized pilot.
- **Features**:
  - **Spectator Mode (Default)**: Telemetry stream is paused (saving 304 network bandwidth). D-Pad and Auto-Pilot controls are locked in read-only mode.
  - **PIN-Protected Arming**: Entering the secret Commander PIN (`2327` by default) arms the station, engages the live 800ms telemetry stream, and unlocks motor actuation.
  - **Session Persistence**: Authorizes the pilot's device for the duration of the browser session (`sessionStorage`) without requiring repeated PIN entry.
  - **One-Click Re-Lock**: Instant lockdown back to Spectator Mode when handing a device to an evaluator or spectator.

---

### Subsystem 3: Obstacle Avoidance Radar
- **What It Is**: An ultrasonic proximity tracking and spatial awareness subsystem paired with an edge-level safety braking mechanism.
- **Purpose**: Prevents physical collisions with walls, furniture, or personnel in real time.
- **Features**:
  - **Interactive Sonar Arc Display**: Visualizes obstacle distance across Clear Zone (>40cm), Caution Zone (15–40cm), and Critical Hazard Zone (<15cm).
  - **Hardware Edge Override Indicator**: Visualizes when the ESP32 safety interrupt independently halts the L298N motor driver (`executedAction: STOP`), even if the user is dispatching `FORWARD`.
  - **Radar Simulator**: Onboard diagnostic tool to test distance scenarios without physical barriers.

---

### Subsystem 4: Flame Detection & Fire Hazard Alert
- **What It Is**: An optical infrared fire-sensing telemetry monitor equipped with server-side normalization and acoustic alarms.
- **Purpose**: Detects open flames, candles, or electrical fire outbreaks early.
- **Features**:
  - **ADC Normalization**: Normalizes raw 12-bit ESP32 analog readings (0=fire, 4095=safe) into a clean 0%–100% fire intensity index.
  - **Dynamic Sensitivity Slider**: Allows operators to recalibrate trigger thresholds live in response to ambient lighting.
  - **Web Audio Siren**: Generates a browser audio alarm upon hazard detection with an Acknowledge/Mute toggle.
  - **Incident Logging**: Records confirmed fire incidents in MongoDB Atlas with peak intensity and trigger thresholds.

---

### Subsystem 5: Air Safety & Hazardous Gas / Smoke Monitoring
- **What It Is**: An environmental gas and smoke tracking station powered by an MQ-2 analog sensor.
- **Purpose**: Detects toxic fumes, LPG, methane, and smoke to prevent asphyxiation and explosion hazards.
- **Features**:
  - **Room Baseline Calibration**: Calibrate ambient room air to compute relative hazard deltas (`gasDelta = gasRaw - baseline`).
  - **Three-Tier Status**: Categorizes air quality into *SAFE*, *MODERATE*, and *HAZARDOUS*.
  - **Rolling Sparkline Trend**: 12-sample historical graph tracking real-time ppm curves.
  - **Sensor Warm-Up Indicator**: Visual countdown while the internal MQ-2 heating coil stabilizes.

---

### Subsystem 6: Health Vitals & Field Triage
- **What It Is**: A mobile physiological screening station designed for emergency checkups, first aid assistance, and field triage.
- **Purpose**: Measures pulse rate and surface body temperature without separate diagnostic tools.
- **Features**:
  - **3-Mode Diagnostic Selector**: Supports *Heart Rate Only* (BPM), *Body Temp Only* (°C / °F), or *Full Vital Scan*.
  - **Optical Finger Contact Detection**: Warns if finger contact is absent on the MAX30102 sensor.
  - **Decoupled Database Persistence**: Records complete medical checkups into MongoDB Atlas.

---

### Subsystem 7: Mission Control Cockpit & Visual Architecture
- **What It Is**: The primary unified dashboard combining all sensor widgets, operational telemetry, and communication health diagnostics.
- **Purpose**: Gives the commander complete situational awareness at a single glance.
- **Features**:
  - **Mission-Control Tactical Sub-Navbar**: Deep industrial dark slate toolbar (`#0f172a`) with cyber-blue glowing active tabs.
  - **Flank-Contrast Holographic Artwork**: 68% vivid background visibility showcasing the 4-wheeled rover on the left and the 5 sensor badges on the right, with a 72% soft wash over central cockpit cards for maximum legibility.
  - **Universal Front-Facing Selection Modals**: Dropdown menus pop up in front as centered modal cards with dimmed backdrops, preventing card overlap across desktop and mobile.
  - **System Architecture Topology**: High-resolution inspect modal displaying the full MERN + ESP32 pipeline.

---

## 4. Hardware Pinout Reference (ESP32)

| Component | Sensor Pin | ESP32 GPIO Pin | Communication Type |
| :--- | :--- | :--- | :--- |
| **Flame Sensor (KY-026)** | AO (Analog Out) | GPIO 34 (ADC1) | Analog Read (0–4095) |
| **Gas Sensor (MQ-2)** | AO (Analog Out) | GPIO 35 (ADC1) | Analog Read (0–4095) |
| **Ultrasonic Sensor (HC-SR04)** | Trig | GPIO 5 | Digital Output (10 us pulse) |
| **Ultrasonic Sensor (HC-SR04)** | Echo | GPIO 18 | Digital Input (Pulse width) |
| **Pulse Sensor (MAX30102)** | SDA / SCL | GPIO 21 / GPIO 22 | I2C Bus |
| **Temperature Sensor (MLX90614)**| SDA / SCL | GPIO 21 / GPIO 22 | I2C Bus |
| **Motor Driver (L298N / TB6612)**| IN1, IN2, IN3, IN4 | GPIO 12, 13, 14, 27 | Digital Direction / PWM |

*Note: Always use ADC1 pins (GPIO 32, 33, 34, 35) for analog sensors because ADC2 is disabled on the ESP32 when Wi-Fi is active.*

---

## 5. REST API Specifications

### Navigation & Obstacle
- `POST /api/navigation/command` — Dispatches direction and mode from Web UI (`{ action, mode, source }`).
- `GET /api/navigation/command` — Polled by ESP32 every 400–500 ms to retrieve latest instruction.
- `POST /api/navigation/status` — Pushed by ESP32 to report distance and safety overrides (`{ distanceCm, obstacleDetected, executedAction }`).
- `GET /api/navigation/status` — Polled by Web UI to render the radar arc and command audit history.
- `GET /api/navigation/history` — Returns recent navigation command audit trail.
- `DELETE /api/navigation/history` — Clears command trail log.

### Environmental & Safety
- `POST /api/flame` — Receives `flameRaw` from ESP32, normalizes to 0–100%, evaluates threshold, logs fire incidents.
- `GET /api/flame/live` — Returns current `flameIntensity`, `isFireDetected`, and threshold.
- `PATCH /api/flame/threshold` — Updates detection sensitivity threshold from UI slider.
- `GET /api/flame/logs` — Retrieves recorded fire incidents.
- `POST /api/gas` — Receives `gasRaw` from ESP32, computes relative delta against baseline, logs hazardous leaks.
- `GET /api/gas/live` — Returns live gas delta, 3-tier status, baseline, and stabilization state.
- `POST /api/gas/calibrate` — Updates room baseline to current ambient ADC value.
- `GET /api/gas/logs` — Retrieves recorded gas/smoke leak incidents.

### Health Vitals
- `POST /api/vitals` — Receives `heartRate`, `bodyTempC`, and `fingerDetected` from ESP32.
- `GET /api/vitals/live` — Returns latest physiological readings.
- `POST /api/vitals/save` — Persists current checkup into MongoDB based on active triage mode.
- `GET /api/vitals/logs` — Retrieves historical health checkups.

---

## 6. Cloud Deployment Architecture (Vercel & MongoDB Atlas)

### Environment Variables

| Variable | Scope | Purpose | Example Value |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | Backend (Vercel) | Atlas cluster connection URI | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/bot_db?retryWrites=true&w=majority` |
| `PORT` | Backend (Local) | Local Express port | `8000` |
| `VITE_API_URL` | Frontend (Vercel) | Deployed backend URL (no trailing slash) | `https://bot-backend.vercel.app` |
| `VITE_COMMANDER_PIN` | Frontend (Optional) | Custom Commander PIN (defaults to 2327) | `2327` |

### Step 1: MongoDB Atlas Configuration
1. **Network Access Whitelist**:
   - Go to MongoDB Atlas -> **Security** -> **Network Access**.
   - Add `0.0.0.0/0` (**Allow Access From Anywhere**) to allow Vercel serverless IP rotation.
2. **Database Connection URI**:
   - Standard format:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/bot_db?retryWrites=true&w=majority
     ```

### Step 2: Push Codebase to GitHub
```powershell
git add .
git commit -m "feat: complete multi-purpose bot assistant deployment build"
git push
```

### Step 3: Deploy Backend on Vercel
1. In Vercel, import your `Bot-Controller` repository.
2. Set **Root Directory** to `backend`.
3. Add Environment Variable:
   - `MONGO_URI` = `<Your MongoDB Atlas connection URI>`
4. Click **Deploy**. Copy your backend URL (e.g. `https://bot-backend.vercel.app`).

### Step 4: Deploy Frontend on Vercel
1. In Vercel, import `Bot-Controller` a second time as a new project.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Add Environment Variable:
   - `VITE_API_URL` = `<Your backend URL from Step 3>`
5. Click **Deploy**.

---

## 7. Project Directory Structure

```
Bot/
├── .gitignore                          # Root ignore rules protecting environment files
├── README.md                           # Master system documentation
├── backend/
│   ├── .env                            # Backend local environment keys
│   ├── vercel.json                     # Serverless build and route config
│   ├── package.json                    # Backend dependencies & scripts
│   ├── api/
│   │   └── index.js                    # Serverless entry point with async DB middleware
│   └── src/
│       ├── app.js                      # Express standalone application entry point
│       ├── config/
│       │   └── db.js                   # Mongoose connection pooling handler
│       ├── controllers/
│       │   ├── commandController.js    # Heartbeat & legacy command queue
│       │   ├── flameController.js      # Normalization & fire detection
│       │   ├── gasController.js        # Air baseline & leak detection
│       │   ├── navigationController.js # Drive commands, audit trail & obstacle safety
│       │   ├── sensorController.js     # Legacy multi-sensor ingestion
│       │   └── vitalsController.js     # Decoupled physiological triage
│       ├── models/
│       │   ├── FlameIncident.js        # Fire outbreak schema
│       │   ├── GasIncident.js          # Hazardous gas incident schema
│       │   ├── NavAuditLog.js          # Command audit log schema
│       │   ├── NavigationState.js      # Active navigation & obstacle state
│       │   └── VitalRecord.js          # Patient vitals checkup schema
│       └── routes/
│           ├── commandRoutes.js
│           ├── flameRoutes.js
│           ├── gasRoutes.js
│           ├── navigationRoutes.js
│           ├── sensorRoutes.js
│           └── vitalsRoutes.js
└── frontend/
    ├── .env                            # Frontend local environment keys
    ├── vercel.json                     # SPA client-side rewrite rules (prevents 404s)
    ├── package.json                    # Frontend dependencies & scripts
    ├── vite.config.js                  # Vite bundler configuration
    ├── public/
    │   ├── bot-bg-img.png              # Holographic lab background with rover & sensor badges
    │   └── Smart Robot Assistant Dashboard.png  # High-res architecture topology
    └── src/
        ├── App.jsx                     # Route tree wrapped in SecurityProvider
        ├── main.jsx                    # React root mounting
        ├── index.css                   # Global theme with flank-contrast artwork styling
        ├── context/
        │   └── SecurityContext.jsx     # Commander RBAC interlock provider & session store
        ├── services/
        │   └── api.js                  # Centralized REST API service
        ├── components/
        │   ├── Navbar/                 # Tactical dark toolbar with universal modal
        │   ├── SecurityModal/          # PIN-based Commander authentication dialog
        │   └── StatusBadge/            # Reusable status pill component
        └── pages/
            ├── Dashboard/              # Cockpit view with architecture modal & arming pill
            ├── FlameDetection/         # Fire intensity meter & alarm
            ├── GasMonitor/             # Air safety & calibration station
            ├── HealthMonitor/          # 3-mode decoupled vitals screening
            ├── Navigation/             # Manual D-Pad, 0ms audit trail & voice commander
            └── ObstacleStatus/         # 3-zone radar arc & safety monitor
```
