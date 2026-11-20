# Hardware Integration & Interface Specification (ICD)
**Multi-Purpose Bot Assistant: Decoupled Dual-ESP32 Architecture**

This specification defines the hardware wiring, communication contracts, safety logic, and firmware templates required to interface the physical robot chassis with the live Vercel cloud controller.

---

## 1. Cloud Broker Details

* **Live Cloud Backend URL:**  
  `https://bot-controller-system-oduafoc5h-mr-raza-alams-projects.vercel.app`  
  *(Note: Replace with your custom production Vercel domain if configured; never add a trailing slash `/`).*
* **Network Protocol:** HTTP/1.1 REST over SSL (`https://`) or standard HTTP.
* **Payload Format:** `application/json` (UTF-8).
* **Serial Baud Rate:** `115200` baud (for both ESP32 USB monitoring).

---

## 2. Dual-ESP32 Architecture Split

To prevent sensor blocking and maintain zero-latency motor response, responsibilities are divided across two microcontrollers:

```
┌─────────────────────────────────────────────────────────────┐
│                    DUAL-ESP32 TOPOLOGY                      │
├──────────────────────────────┬──────────────────────────────┤
│  ESP32 #1: PILOT & DRIVE     │  ESP32 #2: TELEMETRY & VITAL │
│  • L298N Dual H-Bridge Motor │  • KY-026 Optical Flame IR   │
│  • HC-SR04 Ultrasonic Sonar  │  • MQ-2 Gas & Smoke Detector │
│  • Local <15cm Auto-Braking  │  • MAX30102 Pulse Oximeter   │
│  • Autonomous Roam Routine   │  • MLX90614 Contactless Temp │
│  • Wi-Fi Loop: 300ms–500ms   │  • Wi-Fi Loop: 1000ms–1500ms │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 3. Hardware Pinout Tables

### ESP32 #1: Navigation & Obstacle Radar

| Peripheral | Component Pin | ESP32 GPIO | Mode / Description |
| :--- | :--- | :--- | :--- |
| **L298N Motor Driver** | IN1 (Left Motor Fwd) | **GPIO 12** | Digital Output |
| **L298N Motor Driver** | IN2 (Left Motor Rev) | **GPIO 13** | Digital Output |
| **L298N Motor Driver** | IN3 (Right Motor Fwd)| **GPIO 14** | Digital Output |
| **L298N Motor Driver** | IN4 (Right Motor Rev)| **GPIO 27** | Digital Output |
| **L298N Motor Driver** | ENA / ENB (Speed)    | 5V / PWM Jumper | Connect to 5V (or GPIO 25, 26 for PWM) |
| **HC-SR04 Sonar** | Trig (Trigger)       | **GPIO 5** | Digital Output (10µs pulse) |
| **HC-SR04 Sonar** | Echo (Receiver)      | **GPIO 18** | Digital Input (Voltage divider to 3.3V) |

> **IMPORTANT:** The HC-SR04 `Echo` pin outputs 5V. Use a simple voltage divider (1kΩ and 2kΩ resistors) before connecting `Echo` to ESP32 GPIO 18 to protect the 3.3V microcontroller pin.

---

### ESP32 #2: Environmental & Physiological Telemetry

| Peripheral | Component Pin | ESP32 GPIO | Mode / Description |
| :--- | :--- | :--- | :--- |
| **KY-026 Flame Sensor** | AO (Analog Out) | **GPIO 34 (ADC1)** | Analog Read (0–4095) |
| **MQ-2 Gas Sensor**     | AO (Analog Out) | **GPIO 35 (ADC1)** | Analog Read (0–4095) |
| **MAX30102 Pulse Sensor** | SDA (Data)   | **GPIO 21** | I2C Bus (Shared) |
| **MAX30102 Pulse Sensor** | SCL (Clock)  | **GPIO 22** | I2C Bus (Shared) |
| **MLX90614 Temp Sensor**  | SDA (Data)   | **GPIO 21** | I2C Bus (Shared) |
| **MLX90614 Temp Sensor**  | SCL (Clock)  | **GPIO 22** | I2C Bus (Shared) |

> **CRITICAL ADC WARNING:**  
> Never use **ADC2 pins** (GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27) for analog sensor reads on the ESP32. ADC2 is hardware-disabled whenever Wi-Fi is transmitting. Always use **ADC1 pins (GPIO 32, 33, 34, 35)**.

---

## 4. REST API Data Contracts

### 4.1 Drive Instruction Retrieval (ESP32 #1)
* **Endpoint:** `GET /api/navigation/command`
* **Rate:** Poll every **300ms–500ms**
* **Response (JSON):**
  ```json
  {
    "mode": "MANUAL",
    "action": "FORWARD"
  }
  ```
* **Possible Values:**
  * `mode`: `"MANUAL"` or `"AUTONOMOUS"`
  * `action`: `"FORWARD"`, `"BACKWARD"`, `"LEFT"`, `"RIGHT"`, `"STOP"`

---

### 4.2 Obstacle Proximity Feedback (ESP32 #1)
* **Endpoint:** `POST /api/navigation/status`
* **Rate:** Push immediately after sonar ping (every 300ms–500ms)
* **Payload (JSON):**
  ```json
  {
    "distanceCm": 28,
    "obstacleDetected": false,
    "executedAction": "FORWARD"
  }
  ```
* **Key Definitions:**
  * `distanceCm` *(Number)*: Physical clearance measured by sonar (e.g. `12`, `45`, `999`).
  * `obstacleDetected` *(Boolean)*: `true` if `distanceCm < 15`.
  * `executedAction` *(String)*: What the motors are **actually** doing right now (`"STOP"`, `"FORWARD"`, etc.).

---

### 4.3 Optical Flame Telemetry (ESP32 #2)
* **Endpoint:** `POST /api/flame`
* **Rate:** Push every **1000ms–1500ms**
* **Payload (JSON):**
  ```json
  {
    "flameRaw": 3820
  }
  ```
* **Notes:**
  * `flameRaw` must be an integer between `0` and `4095`.
  * The cloud backend automatically normalizes: `4095 = 0% (Dark/Safe)`, `0 = 100% (Direct Flame)`.
  * The cloud handles incident logging and triggers the browser audio alarm.

---

### 4.4 Air Quality / Gas Telemetry (ESP32 #2)
* **Endpoint:** `POST /api/gas`
* **Rate:** Push every **1000ms–1500ms**
* **Payload (JSON):**
  ```json
  {
    "gasRaw": 560
  }
  ```
* **Notes:**
  * `gasRaw` is the raw analog reading from the MQ-2 sensor.
  * The cloud compares this against the room baseline and auto-classifies into `SAFE`, `MODERATE`, or `HAZARDOUS`.

---

### 4.5 Health Vitals Telemetry (ESP32 #2)
* **Endpoint:** `POST /api/vitals`
* **Rate:** Push when patient/finger contact is detected or every 2000ms
* **Payload (JSON):**
  ```json
  {
    "heartRate": 76,
    "bodyTempC": 36.7,
    "fingerDetected": true
  }
  ```
* **Notes:**
  * If no finger is placed on MAX30102, send `{"fingerDetected": false, "heartRate": 0}`.

---

## 5. Local Edge Safety Logic (The 15cm Interrupt)

To ensure the robot never crashes due to Wi-Fi latency, **the ESP32 must execute safety braking locally**:

```c
// Sample decision logic inside ESP32 #1 loop:
float distance = readSonarDistance();

if (distance < 15.0 && distance > 0) {
    // CRITICAL HAZARD: Force motors to STOP locally, ignoring cloud forward command
    haltMotors();
    reportStatus(distance, true, "STOP");
} else if (mode == "AUTONOMOUS") {
    // AUTO-PILOT ROUTINE: Roam forward until obstacle within 25cm, then pivot right
    if (distance < 25.0 && distance > 0) {
        turnRight();
        reportStatus(distance, false, "RIGHT");
    } else {
        driveForward();
        reportStatus(distance, false, "FORWARD");
    }
} else {
    // MANUAL PILOT: Execute cloud command
    executeCommand(action);
    reportStatus(distance, false, action);
}
```

---

## 6. Firmware Code Templates

### 6.1 ESP32 #1 Template (Drive & Sonar Master)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* baseUrl = "https://bot-controller-system-oduafoc5h-mr-raza-alams-projects.vercel.app";

// Pin definitions
const int PIN_IN1 = 12;
const int PIN_IN2 = 13;
const int PIN_IN3 = 14;
const int PIN_IN4 = 27;
const int PIN_TRIG = 5;
const int PIN_ECHO = 18;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_IN3, OUTPUT);
  pinMode(PIN_IN4, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nESP32 #1 Connected to Wi-Fi");
}

float measureDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~500cm)
  if (duration == 0) return 999.0;
  return duration * 0.034 / 2.0;
}

void setMotors(String action) {
  if (action == "FORWARD") {
    digitalWrite(PIN_IN1, HIGH); digitalWrite(PIN_IN2, LOW);
    digitalWrite(PIN_IN3, HIGH); digitalWrite(PIN_IN4, LOW);
  } else if (action == "BACKWARD") {
    digitalWrite(PIN_IN1, LOW); digitalWrite(PIN_IN2, HIGH);
    digitalWrite(PIN_IN3, LOW); digitalWrite(PIN_IN4, HIGH);
  } else if (action == "LEFT") {
    digitalWrite(PIN_IN1, LOW); digitalWrite(PIN_IN2, HIGH);
    digitalWrite(PIN_IN3, HIGH); digitalWrite(PIN_IN4, LOW);
  } else if (action == "RIGHT") {
    digitalWrite(PIN_IN1, HIGH); digitalWrite(PIN_IN2, LOW);
    digitalWrite(PIN_IN3, LOW); digitalWrite(PIN_IN4, HIGH);
  } else { // STOP
    digitalWrite(PIN_IN1, LOW); digitalWrite(PIN_IN2, LOW);
    digitalWrite(PIN_IN3, LOW); digitalWrite(PIN_IN4, LOW);
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) return;

  // 1. Measure clearance
  float dist = measureDistanceCm();
  bool isBlocked = (dist < 15.0 && dist > 0);

  // 2. Poll command from cloud
  HTTPClient http;
  String commandUrl = String(baseUrl) + "/api/navigation/command";
  http.begin(commandUrl);
  int httpCode = http.GET();

  String mode = "MANUAL";
  String targetAction = "STOP";
  String executedAction = "STOP";

  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<200> doc;
    deserializeJson(doc, payload);
    mode = doc["mode"].as<String>();
    targetAction = doc["action"].as<String>();
  }
  http.end();

  // 3. Safety interlock & Motor actuation
  if (isBlocked && targetAction == "FORWARD") {
    setMotors("STOP");
    executedAction = "STOP";
  } else if (mode == "AUTONOMOUS") {
    if (dist < 25.0 && dist > 0) {
      setMotors("RIGHT");
      executedAction = "RIGHT";
    } else {
      setMotors("FORWARD");
      executedAction = "FORWARD";
    }
  } else {
    setMotors(targetAction);
    executedAction = targetAction;
  }

  // 4. Report feedback back to cloud
  http.begin(String(baseUrl) + "/api/navigation/status");
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<200> statusDoc;
  statusDoc["distanceCm"] = dist;
  statusDoc["obstacleDetected"] = isBlocked;
  statusDoc["executedAction"] = executedAction;

  String statusPayload;
  serializeJson(statusDoc, statusPayload);
  http.POST(statusPayload);
  http.end();

  delay(350); // Polling loop interval
}
```

---

### 6.2 ESP32 #2 Template (Telemetry Hub)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* baseUrl = "https://bot-controller-system-oduafoc5h-mr-raza-alams-projects.vercel.app";

const int PIN_FLAME = 34; // ADC1
const int PIN_GAS = 35;   // ADC1

void setup() {
  Serial.begin(115200);
  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_GAS, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nESP32 #2 Connected to Wi-Fi");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) return;

  // 1. Read environmental sensors
  int flameRaw = analogRead(PIN_FLAME);
  int gasRaw = analogRead(PIN_GAS);

  HTTPClient http;

  // Push Flame reading
  http.begin(String(baseUrl) + "/api/flame");
  http.addHeader("Content-Type", "application/json");
  String flamePayload = "{\"flameRaw\":" + String(flameRaw) + "}";
  http.POST(flamePayload);
  http.end();

  // Push Gas reading
  http.begin(String(baseUrl) + "/api/gas");
  http.addHeader("Content-Type", "application/json");
  String gasPayload = "{\"gasRaw\":" + String(gasRaw) + "}";
  http.POST(gasPayload);
  http.end();

  // Push Sample Vitals (Replace with MAX30102 / MLX90614 I2C read values)
  http.begin(String(baseUrl) + "/api/vitals");
  http.addHeader("Content-Type", "application/json");
  String vitalsPayload = "{\"heartRate\":72,\"bodyTempC\":36.6,\"fingerDetected\":true}";
  http.POST(vitalsPayload);
  http.end();

  delay(1200); // 1.2s sensor telemetry interval
}
```

---

## 7. Pre-Flight Verification Checklist

Before turning on high-current battery power:
1. [ ] Both ESP32s connect to Wi-Fi and print their local IP on the serial monitor (115200 baud).
2. [ ] Test ESP32 #1 without motors attached: verify `distanceCm` changes on the live Vercel radar arc when moving your hand in front of the HC-SR04.
3. [ ] Test ESP32 #2: hold a lighter (unlit for gas, lit for flame) near KY-026 and MQ-2 to verify the cloud sounds the alarm and logs the incident to MongoDB Atlas.
4. [ ] Power on L298N motor driver with a dedicated 7.4V / 11.1V LiPo battery. Ensure **common GND** between the battery and the ESP32 ground pin.
