# THE MULTI-PURPOSE BOT ASSISTANT
## PILOT FIELD MANUAL & OPERATOR NOTEBOOK
**Document Version:** 2.4.0  
**Target Hardware:** Dual ESP32 Microcontrollers + L298N Motor Driver  
**Virtual Controller:** React 18 Telemetry Station & Decoupled MERN Backend  
**Security Classification:** Commander Interlock Protected (PIN Required)

---

### PRE-FLIGHT BRIEFING & INTRODUCTION
Welcome to the official **Pilot Field Manual & Operator Notebook** for the Multi-Purpose Bot Assistant. Just as a commercial drone, industrial rover, or dedicated gaming station carries an operational manual illustrating each button, stick, and safety rule, this notebook serves as your operational reference.

Review this document prior to powering on the rover chassis or sending high-current drive commands.

```
+=============================================================================+
|                      DECOUPLED TELEOPERATION TOPOLOGY                       |
+=============================================================================+
|                                                                             |
|  [ PILOT OPERATOR ]                                                         |
|         │                                                                   |
|         ▼                                                                   |
|  [ REACT VIRTUAL CONTROLLER ]                                               |
|  (Commander Cockpit & D-Pad)                                                |
|         │                                                                   |
|         │ (HTTP REST / JSON / Vercel HTTPS) [LEG A: CLOUD LINK]             |
|         ▼                                                                   |
|  [ CLOUD BROKER / NODE.JS & MONGODB ]                                       |
|  (State Buffer, Audit Logs & Telemetry Sync)                                |
|         │                                                                   |
|         │ (Wi-Fi 2.4GHz / Heartbeat Polling 50ms) [LEG B: HARDWARE LINK]    |
|         ▼                                                                   |
|  [ DUAL ESP32 ROVER CHASSIS ] ──► [ L298N MOTORS ]                          |
|         │                      ──► [ HC-SR04 SONAR RADAR ]                  |
|         │                      ──► [ MQ-2 / FLAME / MAX30102 / MLX90614 ]   |
|         ▼                                                                   |
|  [ 15CM LOCAL EMERGENCY BRAKE ] (Hardware Level • 0ms Lag Cutoff)           |
+=============================================================================+
```

---

### CHAPTER 1: TELEMETRY STATUS INDICATORS
The top navigation bar and Card-0 (Commander Cockpit) feature dual health beacons. Understand the distinction between **Broker (Cloud)** and **Bot**:

| Indicator Label | Monitored Connection Leg | Green / Active | Amber / Standby | Red / Offline |
| :--- | :--- | :--- | :--- | :--- |
| **CLOUD / BROKER** | Leg A: Browser Station to Cloud Server | Connected (HTTP 200) | Connecting... (Handshake) | Disconnected (No Server Ping) |
| **BOT HEARTBEAT** | Leg B: Cloud Server to ESP32 Rover | Online (<12s check-in) | Standby (12s–60s check-in) | Offline (>60s or No Ping) |

```
NAVBAR TELEMETRY READOUT:
[ CLOUD: CONNECTED ]  ● ──► Express Broker on Vercel is Healthy & Responding
[ BOT: ONLINE      ]  ● ──► Dual ESP32 Rover Transceiver checked in < 4s ago
```

*Note: If the Cloud beacon shows `DISCONNECTED`, verify that `VITE_API_URL` is set to your deployed backend URL in the Vercel Project Settings.*

---

### CHAPTER 2: COMMANDER SECURITY INTERLOCK (RBAC)
To prevent accidental motor engagement or unauthorized command dispatch during public exhibitions, the station operates under an **Arming Interlock**:

```
+-----------------------------------------------------------------------------+
|                     SECURITY STATE TRANSITION MATRIX                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|      [ SPECTATOR MODE ]  ────────( PIN: 2327 )───────►  [ ARMED MODE ]      |
|      • Read-only visual mode                            • Full D-Pad drive  |
|      • Drive buttons locked                             • Voice commander   |
|      • Zero network polling                             • 1500ms auto-poll  |
|      • Safe for public display                          • Calibration enabled|
|                                                                             |
|      [ ARMED MODE ]      ──────( Lock Button )───────►  [ SPECTATOR MODE ]  |
+-----------------------------------------------------------------------------+
```

#### How to Arm the Station:
1. Locate the **Lock Badge** in the top navigation bar (`SPECTATOR MODE`).
2. Click the badge to open the **Commander Authentication Console**.
3. Input the Master Commander PIN: **`2327`**.
4. Click `[VERIFY & ARM CONTROLLER]`.
5. The station transitions to `STATION ARMED` (Red alert outline and audio-visual verification). All drive controls unlock.

---

### CHAPTER 3: D-PAD DIRECTIONAL DRIVE & DEAD-MAN SWITCH
The virtual navigation module utilizes an industrial **Dead-Man Switch Protocol**. Motors only spin while an intentional hold pressure is maintained by the operator.

```
                   [ D-PAD VIRTUAL CONTROLLER ]

                         ┌─────────────┐
                         │   ▲ FORWARD │  [Key: W / Up Arrow]
                         │   (GPIO 26) │
          ┌──────────────┼─────────────┼──────────────┐
          │   ◄ PIVOT L  │   ■ BRAKE   │   ► PIVOT R  │
          │   (Left Spin)│   (STOP)    │   (Right Spin│
          │   (GPIO 27)  │   [Key: S]  │   (GPIO 14)  │
          └──────────────┼─────────────┼──────────────┘
                         │   ▼ REVERSE │  [Key: X / Down Arrow]
                         │   (GPIO 12) │
                         └─────────────┘
```

#### Control Logic & Drive Actions:
* **▲ FORWARD:** Both Left & Right tracks move forward simultaneously.
* **▼ REVERSE:** Both Left & Right tracks move backward simultaneously.
* **◄ PIVOT LEFT:** Left tracks counter-rotate backward; Right tracks rotate forward (Instant zero-radius tank turn).
* **► PIVOT RIGHT:** Right tracks counter-rotate backward; Left tracks rotate forward (Instant zero-radius tank turn).
* **■ BRAKE / STOP:** Immediate motor signal cut (`IN1=LOW, IN2=LOW, IN3=LOW, IN4=LOW`).

#### Dead-Man Switch Safety Rule:
* **Mouse / Touch:** `onMouseDown` or `onTouchStart` dispatches the active drive vector.
* **Automatic Release:** `onMouseUp`, `onMouseLeave`, or `onTouchEnd` immediately dispatches an autonomous `STOP` command to halt movement the instant the pilot releases the touch surface.

---

### CHAPTER 4: BILINGUAL VOICE COMMANDER LEXICON
The Cockpit features an onboard speech recognition system operating in `en-IN` (Indian English bilingual phonetics).

```
+─────────────────────────────────────────────────────────────────────────────+
|                         VOICE COMMAND DICTIONARY                            |
+──────────────────────────┬──────────────────────────┬───────────────────────+
| INTENDED ROBOT ACTION    | ACCEPTED ENGLISH PHRASES | ACCEPTED HINDI WORDS  |
+──────────────────────────┼──────────────────────────┼───────────────────────+
| Drive Forward (▲)        | "forward", "go", "ahead" | "aage", "chalo"       |
| Reverse Motion (▼)       | "back", "reverse"        | "peeche", "peeche lo" |
| Pivot Left (◄)           | "left", "turn left"      | "baye", "baye ghumo"  |
| Pivot Right (►)          | "right", "turn right"    | "daye", "daye ghumo"  |
| Emergency Halt (■)       | "stop", "halt", "break"  | "ruko", "ruk jao"     |
+──────────────────────────┴──────────────────────────┴───────────────────────+
```

#### Voice Operation Procedure:
1. Ensure the station is in **ARMED MODE**.
2. Click the `[Voice Pilot]` microphone button on the Smart Navigation card.
3. Speak clearly into your device microphone (e.g., *"Aage"* or *"Forward"*).
4. The Cockpit displays the parsed speech transcript and dispatches the drive action immediately.
5. Voice commands execute a timed drive burst followed by an automatic brake for safety.

---

### CHAPTER 5: OBSTACLE RADAR & 15CM HARDWARE FAILSAFE
The front bumper houses an HC-SR04 ultrasonic transceiver pulsing at 40 kHz. The software virtual station visualizes proximity across three distinct warning tiers:

```
+=============================================================================+
|                       PROXIMITY WARNING DISTANCE ZONES                      |
+=============================================================================+
|                                                                             |
|  [ROVER] ───0cm────(15cm)─────────────────(50cm)──────────────────────> 200cm|
|    |          |              |                            |                 |
|    |  ZONE 3: CRITICAL       |     ZONE 2: CAUTION        |  ZONE 1: CLEAR  |
|    |  Distance: < 15 cm      |     Distance: 15 - 50 cm   |  Distance: >50cm|
|    |  Color: RED             |     Color: AMBER           |  Color: GREEN   |
|    |  Motors: CUT OFF LOCALLY|     Motors: ACTIVE         |  Motors: ACTIVE |
|    |  (Hardware Lockout)     |     (Pilot Caution)        |  (Nominal Drive)|
+=============================================================================+
```

#### Zero-Latency Collision Prevention Rule:
If distance drops below **15 cm**, Pilot `FORWARD` commands from the web station are **overridden by the local ESP32 firmware in <2 milliseconds**. Even if the cloud connection has a 200ms latency, the rover physically stops itself from striking a wall or human foot.

---

### CHAPTER 6: SENSOR SUBSYSTEMS & CALIBRATION GUIDE

#### 1. Optical Flame Detection Subsystem
* **Sensor Type:** Multi-spectral Phototransistor (760nm–1100nm IR spectrum).
* **Normal Safe Range:** Raw ADC reading `3800 – 4095` (Intensity 0%–10%).
* **Flame Detected:** Raw ADC reading `< 1600` (Intensity >60%).
* **Action on Fire:** Red warning banner activates on Cockpit; rover on-board buzzer sounds continuously; motors lock against moving toward the heat source.

#### 2. MQ-2 Air Safety & Gas Monitor
* **Sensor Type:** SnO2 semiconductor sensor sensitive to LPG, Smoke, CO, and Methane.
* **Pre-Heating Phase:** Requires 20 seconds on initial boot for the internal ceramic coil to reach stable operating temperature (Station displays `WARMING UP`).
* **Dynamic Delta Math:** 
  $$\Delta \text{Gas} = \text{Raw Reading} - \text{Ambient Baseline}$$
* **Thresholds:**
  * $\Delta < 150$: `SAFE` (Normal room air).
  * $150 \le \Delta < 400$: `MODERATE / SMOKE` (Caution: localized fumes).
  * $\Delta \ge 400$: `HAZARDOUS` (Emergency gas leak alert).

#### 3. Vital Biometrics (Health Station)
* **Pulse Rate (MAX30102):** Place fingertip gently over the optical lens. The photodiode measures arterial blood volume variance (PPG). Target normal pulse: `60 – 100 BPM`.
* **Surface Temperature (MLX90614):** Non-contact infrared thermopile thermometer. Target normal human temperature: `36.1°C – 37.2°C` (`97.0°F – 99.0°F`). Readings above `38.0°C` (`100.4°F`) trigger the `FEVER DETECTED` indicator.

---

### CHAPTER 7: EMERGENCY TROUBLESHOOTING CHECKLIST

| Symptom | Diagnostic Cause | Resolution Action |
| :--- | :--- | :--- |
| **Broker shows `Offline`** | Backend Vercel URL not injected into frontend build | Set `VITE_API_URL=https://<your-backend>.vercel.app` in Vercel project environment variables and redeploy. |
| **Bot shows `Offline`** | ESP32 Wi-Fi disconnected or power switch off | Verify 5V battery pack on rover chassis and check serial monitor at 115200 baud for IP assignment. |
| **D-Pad does not respond** | Controller is in Spectator Mode | Click the Lock badge on the top right, enter Commander PIN `2327`, and arm the station. |
| **Motors do not drive Forward** | Distance sensor reads < 15 cm | Inspect front bumper; clear obstacle from ultrasonic line-of-sight to clear the safety brake. |
| **Gas sensor reads constant high** | Sensor heater has not normalized | Allow 60 seconds after power-on; click `[Calibrate Baseline]` on the Gas Monitor page. |

---
*Manual compiled by the Autonomous Systems Development Team for the Multi-Purpose Bot Assistant.*
