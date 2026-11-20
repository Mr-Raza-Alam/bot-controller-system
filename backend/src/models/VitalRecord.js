// model for persisting real health triage checkups in mongodb
// supports isolated heart rate, isolated fever checks, or full vital scans

const mongoose = require("mongoose");

const VitalRecordSchema = new mongoose.Schema(
  {
    checkType: {
      type: String,
      enum: ["HEART_RATE", "BODY_TEMP", "BOTH"],
      required: true,
      comment: "Identifies whether triage was cardiac-only, temperature-only, or full",
    },
    heartRate: {
      type: Number,
      default: null,
      comment: "Pulse rate in BPM (null if temperature-only triage)",
    },
    heartStatus: {
      type: String,
      enum: ["NORMAL", "ELEVATED", "CRITICAL", "NO_PULSE"],
      default: "NORMAL",
    },
    bodyTempC: {
      type: Number,
      default: null,
      comment: "Body temperature in Celsius (null if cardiac-only triage)",
    },
    bodyTempF: {
      type: Number,
      default: null,
      comment: "Body temperature in Fahrenheit",
    },
    tempStatus: {
      type: String,
      enum: ["NORMAL", "MILD_FEVER", "HIGH_FEVER", "BELOW_AVG"],
      default: "NORMAL",
    },
    fingerDetected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // records checkup timestamp automatically
  }
);

module.exports = mongoose.model("VitalRecord", VitalRecordSchema);
