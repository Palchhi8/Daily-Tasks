const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const AppError = require('../errors/AppError');
const { checkRoomOverlap } = require('../services/overlapService');
const crypto = require('crypto');

// Initial seed rooms
const INITIAL_ROOMS = [
  {
    roomId: 'room_conference_a',
    name: 'Apollo Conference Room A',
    capacity: 12,
    amenities: ['4K Video Conferencing', 'Whiteboard', 'Soundproof Glass', 'Projector'],
    hourlyRate: 45.0
  },
  {
    roomId: 'room_focus_pod_1',
    name: 'Quiet Focus Pod 1',
    capacity: 2,
    amenities: ['Ergonomic Chairs', 'Acoustic Insulation', 'Monitors'],
    hourlyRate: 15.0
  },
  {
    roomId: 'room_boardroom',
    name: 'Executive Boardroom',
    capacity: 20,
    amenities: ['Executive Seating', 'Catering Station', 'Dual 75-inch Displays'],
    hourlyRate: 85.0
  }
];

/**
 * Seeds initial rooms and test accounts if empty
 */
async function seedCoworkingData() {
  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    await Room.insertMany(INITIAL_ROOMS);
    console.log('[DB] Seeded initial coworking rooms into MongoDB Atlas.');
  }

  // Ensure Admin and Member accounts exist
  const adminEmail = 'admin@coworking.io';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: 'AdminPassword123!',
      role: 'ADMIN'
    });
    console.log('[DB] Seeded default ADMIN account: admin@coworking.io');
  }

  const memberEmail = 'alice.member@acme.com';
  const existingMember = await User.findOne({ email: memberEmail });
  if (!existingMember) {
    await User.create({
      name: 'Alice Member',
      email: memberEmail,
      password: 'MemberPassword123!',
      role: 'MEMBER'
    });
    console.log('[DB] Seeded default MEMBER account: alice.member@acme.com');
  }
}

/**
 * Resets test seed bookings (for clean demonstration runs)
 */
async function resetSeedData() {
  await Booking.deleteMany({});
  await Room.deleteMany({});
  await User.deleteMany({ email: { $nin: ['admin@coworking.io', 'alice.member@acme.com'] } });
  await Room.insertMany(INITIAL_ROOMS);
  await seedCoworkingData();
}

/**
 * Controller: Create a new room booking (Protected)
 * POST /api/bookings
 */
async function createBooking(req, res, next) {
  try {
    const { roomId, startTime, endTime, purpose } = req.body;
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 1. Verify Room Exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return next(AppError.notFound(`Coworking room '${roomId}' was not found.`));
    }

    // 2. Strict Overlap Prevention Check
    const overlapResult = await checkRoomOverlap(roomId, start, end);
    if (overlapResult.hasConflict) {
      return next(
        AppError.conflict(
          `Booking conflict detected: Room '${room.name}' is already reserved during the requested time interval.`,
          {
            requestedInterval: { start: start.toISOString(), end: end.toISOString() },
            conflictingBookings: overlapResult.conflicts
          }
        )
      );
    }

    // 3. Create confirmed booking
    const bookingId = `bk_${crypto.randomBytes(4).toString('hex')}`;
    const booking = await Booking.create({
      bookingId,
      roomId: room.roomId,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      startTime: start,
      endTime: end,
      purpose,
      status: 'CONFIRMED'
    });

    res.status(201).json({
      success: true,
      requestId: req.id,
      message: `Room '${room.name}' booked successfully from ${start.toLocaleTimeString()} to ${end.toLocaleTimeString()}.`,
      data: {
        bookingId: booking.bookingId,
        roomId: booking.roomId,
        roomName: room.name,
        bookedBy: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        startTime: booking.startTime,
        endTime: booking.endTime,
        purpose: booking.purpose,
        status: booking.status
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: List bookings (Protected)
 * GET /api/bookings
 * - ADMIN: Views all bookings across the space
 * - MEMBER: Filtered to only their own bookings
 */
async function listBookings(req, res, next) {
  try {
    const query = {};

    // Scope query by role: Members only see their own bookings
    if (req.user.role !== 'ADMIN') {
      query.userId = req.user.id;
    }

    const bookings = await Booking.find(query).sort({ startTime: 1 }).lean();

    res.status(200).json({
      success: true,
      requestId: req.id,
      roleScope: req.user.role,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Cancel a booking (Protected + Ownership / Admin Override Check)
 * DELETE /api/bookings/:bookingId
 */
async function cancelBooking(req, res, next) {
  try {
    // req.booking was attached by checkBookingOwnership middleware!
    const booking = req.booking;

    if (booking.status === 'CANCELLED') {
      return next(AppError.badRequest(`Booking '${booking.bookingId}' is already cancelled.`));
    }

    booking.status = 'CANCELLED';
    await booking.save();

    res.status(200).json({
      success: true,
      requestId: req.id,
      message: `Booking '${booking.bookingId}' successfully cancelled.`,
      cancelledBy: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        isOwner: booking.userId.toString() === req.user.id.toString(),
        isAdminOverride: req.user.role === 'ADMIN' && booking.userId.toString() !== req.user.id.toString()
      },
      data: booking
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  listBookings,
  cancelBooking,
  seedCoworkingData,
  resetSeedData
};
