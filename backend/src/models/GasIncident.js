// model for persisting hazardous gas and smoke incidents in mongodb
// only recorded when air quality breaches the hazardous threshold (avoids database spam)

const mongoose = require("mongoose");

const GasIncidentSchema = new mongoose.Schema(
  {
    peakRaw: {
      type: Number,
      required: true,
      comment: "Raw ADC reading from MQ-2 sensor (0-4095)",
    },
    gasDelta: {
      type: Number,
      required: true,
      comment: "Spike delta above calibrated room baseline",
    },
    baselineAtTrigger: {
      type: Number,
      required: true,
      comment: "Room air baseline active when incident triggered",
    },
    status: {
      type: String,
      default: "HAZARDOUS",
    },
  },
  {
    timestamps: true, // stores createdAt timestamp automatically
  }
);

module.exports = mongoose.model("GasIncident", GasIncidentSchema);
