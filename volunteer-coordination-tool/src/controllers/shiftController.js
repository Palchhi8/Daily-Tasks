const Shift = require('../models/Shift');
const AppError = require('../errors/AppError');

// Base initial shifts for seeding MongoDB Atlas
const INITIAL_SHIFTS = [
  {
    id: 'shift_food_drive_101',
    title: 'Weekend Community Food Drive',
    location: 'Central Food Bank Warehouse',
    date: '2026-11-28',
    startTime: '09:00',
    endTime: '13:00',
    maxVolunteers: 4,
    signups: [
      {
        volunteerId: 'vol_alice_01',
        fullName: 'Alice Smith',
        email: 'alice.smith@example.org',
        phone: '+1-555-0123',
        rolePreference: 'FOOD_DISTRIBUTION',
        emergencyContact: {
          name: 'Bob Smith',
          phone: '+1-555-0124'
        },
        signedUpAt: new Date('2026-11-20T10:00:00.000Z'),
        attendance: {
          status: 'PRESENT',
          checkInTime: new Date('2026-11-28T09:05:00.000Z'),
          hoursServed: 4.0,
          coordinatorNotes: 'Organized warehouse palettes.',
          recordedAt: new Date('2026-11-28T13:00:00.000Z')
        }
      }
    ]
  },
  {
    id: 'shift_park_cleanup_202',
    title: 'Downtown Park Tree Planting',
    location: 'Riverside Community Park',
    date: '2026-11-29',
    startTime: '10:00',
    endTime: '14:00',
    maxVolunteers: 2, // At maximum capacity intentionally for testing 409 Conflict
    signups: [
      {
        volunteerId: 'vol_bob_02',
        fullName: 'Bob Martinez',
        email: 'bob.m@example.org',
        phone: '+1-555-0144',
        rolePreference: 'SETUP_TEARDOWN',
        emergencyContact: {
          name: 'Elena Martinez',
          phone: '+1-555-0145'
        },
        signedUpAt: new Date('2026-11-21T08:30:00.000Z'),
        attendance: null
      },
      {
        volunteerId: 'vol_carol_03',
        fullName: 'Carol Davis',
        email: 'carol.d@example.org',
        phone: '+1-555-0188',
        rolePreference: 'GENERAL_ASSISTANCE',
        emergencyContact: {
          name: 'James Davis',
          phone: '+1-555-0189'
        },
        signedUpAt: new Date('2026-11-21T09:15:00.000Z'),
        attendance: null
      }
    ]
  }
];

/**
 * Ensures MongoDB Atlas has initial shifts seeded
 */
async function seedShiftsIfEmpty() {
  const count = await Shift.countDocuments({});
  if (count === 0) {
    await Shift.insertMany(INITIAL_SHIFTS);
    console.log('[DB] Seeded initial shifts into MongoDB Atlas.');
  }
}

/**
 * Resets seed data in Atlas (used for clean test runs)
 */
async function resetSeedData() {
  await Shift.deleteMany({});
  await Shift.insertMany(INITIAL_SHIFTS);
}

/**
 * Controller: Get shift details
 * GET /api/shifts/:shiftId
 */
async function getShift(req, res, next) {
  try {
    const { shiftId } = req.params;
    const shift = await Shift.findOne({ id: shiftId });

    if (!shift) {
      return next(AppError.notFound(`Shift with ID '${shiftId}' was not found.`));
    }

    res.status(200).json({
      success: true,
      requestId: req.id,
      data: {
        id: shift.id,
        title: shift.title,
        location: shift.location,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        maxVolunteers: shift.maxVolunteers,
        signups: shift.signups,
        currentSignups: shift.signups.length,
        availableSlots: shift.maxVolunteers - shift.signups.length
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Sign up for a volunteer shift
 * POST /api/shifts/:shiftId/signup
 */
async function signupForShift(req, res, next) {
  try {
    const { shiftId } = req.params;
    const volunteerData = req.body;

    const shift = await Shift.findOne({ id: shiftId });
    if (!shift) {
      return next(AppError.notFound(`Shift with ID '${shiftId}' was not found.`));
    }

    // Business Rule 1: Capacity Check
    if (shift.signups.length >= shift.maxVolunteers) {
      return next(
        AppError.conflict(
          `Shift '${shift.title}' is currently at maximum capacity (${shift.maxVolunteers}/${shift.maxVolunteers} volunteers).`
        )
      );
    }

    // Business Rule 2: Duplicate Signup Check
    const alreadySignedUp = shift.signups.some(
      (s) => s.volunteerId === volunteerData.volunteerId || s.email === volunteerData.email
    );
    if (alreadySignedUp) {
      return next(
        AppError.conflict(
          `Volunteer '${volunteerData.fullName}' (${volunteerData.email}) is already registered for this shift.`
        )
      );
    }

    // Create new signup record
    const newSignup = {
      ...volunteerData,
      signedUpAt: new Date(),
      attendance: null
    };

    shift.signups.push(newSignup);
    await shift.save();

    res.status(201).json({
      success: true,
      requestId: req.id,
      message: `Successfully registered for '${shift.title}'.`,
      data: {
        shiftId: shift.id,
        shiftTitle: shift.title,
        volunteerId: newSignup.volunteerId,
        fullName: newSignup.fullName,
        rolePreference: newSignup.rolePreference,
        signedUpAt: newSignup.signedUpAt,
        remainingSlots: shift.maxVolunteers - shift.signups.length
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Record or update volunteer attendance
 * PATCH /api/shifts/:shiftId/attendance
 */
async function recordAttendance(req, res, next) {
  try {
    const { shiftId } = req.params;
    const { volunteerId, status, checkInTime, hoursServed, coordinatorNotes } = req.body;

    const shift = await Shift.findOne({ id: shiftId });
    if (!shift) {
      return next(AppError.notFound(`Shift with ID '${shiftId}' was not found.`));
    }

    const signup = shift.signups.find((s) => s.volunteerId === volunteerId);
    if (!signup) {
      return next(
        AppError.badRequest(
          `Volunteer '${volunteerId}' is not signed up for shift '${shiftId}'. Cannot track attendance.`
        )
      );
    }

    // Update attendance object
    signup.attendance = {
      status,
      checkInTime: checkInTime ? new Date(checkInTime) : (status === 'PRESENT' ? new Date() : null),
      hoursServed: hoursServed !== undefined ? hoursServed : (status === 'PRESENT' ? 4.0 : 0.0),
      coordinatorNotes: coordinatorNotes || null,
      recordedAt: new Date()
    };

    await shift.save();

    res.status(200).json({
      success: true,
      requestId: req.id,
      message: `Attendance marked as '${status}' for volunteer '${signup.fullName}'.`,
      data: {
        shiftId: shift.id,
        volunteerId: signup.volunteerId,
        fullName: signup.fullName,
        attendance: signup.attendance
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getShift,
  signupForShift,
  recordAttendance,
  seedShiftsIfEmpty,
  resetSeedData
};
