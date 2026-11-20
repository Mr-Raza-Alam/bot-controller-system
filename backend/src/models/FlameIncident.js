// model for persisting real fire detection incidents in mongodb
// only written when a true fire event is triggered (avoids database spam)

const mongoose = require("mongoose");

const FlameIncidentSchema = new mongoose.Schema(
  {
    peakIntensity: {
      type: Number,
      required: true,
      comment: "Normalized intensity percentage (0-100%)",
    },
    flameRaw: {
      type: Number,
      required: true,
      comment: "Raw ADC reading from ESP32 (0-4095)",
    },
    thresholdAtTrigger: {
      type: Number,
      required: true,
      comment: "Threshold percentage active when triggered",
    },
    status: {
      type: String,
      default: "FIRE DETECTED",
    },
  },
  {
    timestamps: true, // stores createdAt timestamp automatically
  }
);

module.exports = mongoose.model("FlameIncident", FlameIncidentSchema);
