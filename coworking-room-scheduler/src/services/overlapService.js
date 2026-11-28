const Booking = require('../models/Booking');

/**
 * Checks for overlapping room bookings using interval collision detection:
 * (Existing.startTime < Requested.endTime) AND (Existing.endTime > Requested.startTime)
 *
 * @param {string} roomId - Room identifier to check
 * @param {Date} startTime - Requested booking start
 * @param {Date} endTime - Requested booking end
 * @param {string} [excludeBookingId=null] - Optional booking ID to exclude (when rescheduling)
 * @returns {Promise<{ hasConflict: boolean, conflicts: Array }>}
 */
async function checkRoomOverlap(roomId, startTime, endTime, excludeBookingId = null) {
  const query = {
    roomId,
    status: 'CONFIRMED',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (excludeBookingId) {
    query.bookingId = { $ne: excludeBookingId };
  }

  const conflictingBookings = await Booking.find(query).lean();

  return {
    hasConflict: conflictingBookings.length > 0,
    conflicts: conflictingBookings.map((c) => ({
      bookingId: c.bookingId,
      userEmail: c.userEmail,
      startTime: c.startTime.toISOString(),
      endTime: c.endTime.toISOString(),
      purpose: c.purpose
    }))
  };
}

module.exports = {
  checkRoomOverlap
};
