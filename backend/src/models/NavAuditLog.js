// model for persisting lightweight navigation command audit log (last 10 commands)
// allows students to demonstrate voice vs manual control execution to judges

const mongoose = require("mongoose");

const NavAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["FORWARD", "BACKWARD", "LEFT", "RIGHT", "STOP"],
    },
    mode: {
      type: String,
      enum: ["MANUAL", "AUTONOMOUS"],
      default: "MANUAL",
    },
    source: {
      type: String,
      enum: ["MANUAL", "VOICE"],
      default: "MANUAL",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NavAuditLog", NavAuditLogSchema);
