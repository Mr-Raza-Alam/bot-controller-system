// command schema — stores navigation commands sent from the dashboard to the bot
// feature 5: smart navigation

const mongoose = require("mongoose");

const CommandSchema = new mongoose.Schema(
  {
    command: {
      type: String,
      enum: ["FORWARD", "BACKWARD", "LEFT", "RIGHT", "STOP", "SCAN", "VITALS"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "executed"],
      default: "pending", // pending = esp32 hasn't read it yet
    },

    source: {
      type: String,
      enum: ["voice", "button"],
      default: "button", // how the command was triggered on the dashboard
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Command", CommandSchema);
