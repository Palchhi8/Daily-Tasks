const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    roomId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userEmail: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    purpose: {
      type: String,
      required: true,
      maxlength: 200
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// High-speed compound index for overlap checks: roomId + status + time interval
bookingSchema.index({ roomId: 1, status: 1, startTime: 1, endTime: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
