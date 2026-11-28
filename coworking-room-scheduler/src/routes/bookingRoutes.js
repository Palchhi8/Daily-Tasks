const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, checkBookingOwnership } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBookingSchema,
  bookingParamsSchema
} = require('../validators/bookingValidators');

// All booking routes require valid authentication
router.use(authenticateToken);

// GET /api/bookings - List bookings (Admins see all; Members see own)
router.get('/', bookingController.listBookings);

// POST /api/bookings - Create booking with overlap validation
router.post(
  '/',
  validate(createBookingSchema, 'body'),
  bookingController.createBooking
);

// DELETE /api/bookings/:bookingId - Cancel booking (Requires ownership or ADMIN override)
router.delete(
  '/:bookingId',
  validate(bookingParamsSchema, 'params'),
  checkBookingOwnership,
  bookingController.cancelBooking
);

module.exports = router;
