// sensor schema — stores all readings pushed by the esp32 bot
// features: flame detection, gas/air quality, health monitor, obstacle avoidance

const mongoose = require("mongoose");

const SensorSchema = new mongoose.Schema(
  {
    // feature 1: flame detection
    flame: {
      status: {
        type: String,
        enum: ["Safe", "FIRE DETECTED"],
        default: "Safe",
      },
      rawValue: {
        type: Number,
        default: 0,
      },
    },

    // feature 2: gas / smoke (air quality index)
    gas: {
      aqi: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ["Good", "Moderate", "Unhealthy", "Hazardous"],
        default: "Good",
      },
    },

    // feature 3: health monitor (bpm + body temperature from max30102)
    health: {
      bpm: {
        type: Number,
        default: 0,
      },
      bodyTemp: {
        type: Number,
        default: 0,
      },
    },

    // feature 4: obstacle avoidance (hc-sr04 ultrasonic sensor)
    obstacle: {
      detected: {
        type: Boolean,
        default: false,
      },
      distanceCm: {
        type: Number,
        default: 999,
      },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Sensor", SensorSchema);
