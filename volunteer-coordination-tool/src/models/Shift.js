const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
      required: true
    },
    checkInTime: {
      type: Date,
      default: null
    },
    hoursServed: {
      type: Number,
      min: 0,
      max: 24,
      default: 0
    },
    coordinatorNotes: {
      type: String,
      maxlength: 300,
      default: null
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const signupSchema = new mongoose.Schema(
  {
    volunteerId: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true
    },
    rolePreference: {
      type: String,
      enum: ['CHECK_IN', 'FOOD_DISTRIBUTION', 'SETUP_TEARDOWN', 'TUTORING', 'GENERAL_ASSISTANCE'],
      default: 'GENERAL_ASSISTANCE'
    },
    emergencyContact: {
      name: { type: String, required: true },
      phone: { type: String, required: true }
    },
    notes: {
      type: String,
      maxlength: 300,
      default: null
    },
    signedUpAt: {
      type: Date,
      default: Date.now
    },
    attendance: {
      type: attendanceSchema,
      default: null
    }
  },
  { _id: false }
);

const shiftSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true
    },
    date: {
      type: String,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    maxVolunteers: {
      type: Number,
      required: true,
      min: 1
    },
    signups: [signupSchema]
  },
  {
    timestamps: true
  }
);

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
