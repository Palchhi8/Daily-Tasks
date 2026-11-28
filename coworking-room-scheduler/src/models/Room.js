const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    amenities: [
      {
        type: String,
        trim: true
      }
    ],
    hourlyRate: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
