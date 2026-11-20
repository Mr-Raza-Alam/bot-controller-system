// model for single active navigation state document in mongodb
// tracks current operating mode, action instruction, and ultrasonic radar telemetry

const mongoose = require("mongoose");

const NavigationStateSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["MANUAL", "AUTONOMOUS"],
      default: "MANUAL",
    },
    action: {
      type: String,
      enum: ["FORWARD", "BACKWARD", "LEFT", "RIGHT", "STOP"],
      default: "STOP",
    },
    source: {
      type: String,
      enum: ["MANUAL", "VOICE"],
      default: "MANUAL",
    },
    distanceCm: {
      type: Number,
      default: 999,
      comment: "Live proximity from HC-SR04 ultrasonic sensor in cm",
    },
    obstacleDetected: {
      type: Boolean,
      default: false,
      comment: "True when hardware ultrasonic sensor triggers autonomous halt (<15cm)",
    },
    executedAction: {
      type: String,
      default: "STOP",
      comment: "Actual motor state running on the bot hardware",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NavigationState", NavigationStateSchema);
