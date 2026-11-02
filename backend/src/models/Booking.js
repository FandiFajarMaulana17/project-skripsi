const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true
    },
    passengerName: {
      type: String,
      required: true,
      trim: true
    },
    passengerPhone: {
      type: String,
      required: true,
      trim: true
    },
    passengerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    seats: {
      type: [String],
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED"],
      default: "CONFIRMED"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
