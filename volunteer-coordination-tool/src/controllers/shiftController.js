const AppError = require('../errors/AppError');

// In-Memory Data Store representing shifts and signups
const shiftsDatabase = {
  shift_food_drive_101: {
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
        signedUpAt: '2026-11-20T10:00:00.000Z',
        attendance: { status: 'PRESENT', checkInTime: '2026-11-28T09:05:00.000Z', hoursServed: 4.0 }
      }
    ]
  },
  shift_park_cleanup_202: {
    id: 'shift_park_cleanup_202',
    title: 'Downtown Park Tree Planting',
    location: 'Riverside Community Park',
    date: '2026-11-29',
    startTime: '10:00',
    endTime: '14:00',
    maxVolunteers: 2, // Full capacity intentionally for testing 409 Conflict
    signups: [
      {
        volunteerId: 'vol_bob_02',
        fullName: 'Bob Martinez',
        email: 'bob.m@example.org',
        phone: '+1-555-0144',
        rolePreference: 'SETUP_TEARDOWN',
        signedUpAt: '2026-11-21T08:30:00.000Z',
        attendance: null
      },
      {
        volunteerId: 'vol_carol_03',
        fullName: 'Carol Davis',
        email: 'carol.d@example.org',
        phone: '+1-555-0188',
        rolePreference: 'GENERAL_ASSISTANCE',
        signedUpAt: '2026-11-21T09:15:00.000Z',
        attendance: null
      }
    ]
  }
};

/**
 * Controller: Get shift details
 * GET /api/shifts/:shiftId
 */
function getShift(req, res, next) {
  const { shiftId } = req.params;
  const shift = shiftsDatabase[shiftId];

  if (!shift) {
    return next(AppError.notFound(`Shift with ID '${shiftId}' was not found.`));
  }

  res.status(200).json({
    success: true,
    requestId: req.id,
    data: {
      ...shift,
      currentSignups: shift.signups.length,
      availableSlots: shift.maxVolunteers - shift.signups.length
    }
  });
}

/**
 * Controller: Sign up for a volunteer shift
 * POST /api/shifts/:shiftId/signup
 */
function signupForShift(req, res, next) {
  const { shiftId } = req.params;
  const volunteerData = req.body;

  const shift = shiftsDatabase[shiftId];
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
    signedUpAt: new Date().toISOString(),
    attendance: null
  };

  shift.signups.push(newSignup);

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
}

/**
 * Controller: Record or update volunteer attendance
 * PATCH /api/shifts/:shiftId/attendance
 */
function recordAttendance(req, res, next) {
  const { shiftId } = req.params;
  const { volunteerId, status, checkInTime, hoursServed, coordinatorNotes } = req.body;

  const shift = shiftsDatabase[shiftId];
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
    checkInTime: checkInTime || (status === 'PRESENT' ? new Date().toISOString() : null),
    hoursServed: hoursServed !== undefined ? hoursServed : (status === 'PRESENT' ? 4.0 : 0.0),
    coordinatorNotes: coordinatorNotes || null,
    recordedAt: new Date().toISOString()
  };

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
}

module.exports = {
  getShift,
  signupForShift,
  recordAttendance
};
