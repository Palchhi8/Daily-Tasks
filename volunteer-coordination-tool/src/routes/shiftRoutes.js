const express = require('express');
const validate = require('../middleware/validate');
const {
  shiftParamsSchema,
  signupBodySchema,
  attendanceBodySchema
} = require('../validators/shiftValidators');
const {
  getShift,
  signupForShift,
  recordAttendance
} = require('../controllers/shiftController');

const router = express.Router();

/**
 * Route: GET /api/shifts/:shiftId
 * Retrieves shift details and available volunteer capacity.
 */
router.get(
  '/:shiftId',
  validate(shiftParamsSchema, 'params'),
  getShift
);

/**
 * Route: POST /api/shifts/:shiftId/signup
 * Registers a volunteer for a specific shift with validated payload.
 */
router.post(
  '/:shiftId/signup',
  validate(shiftParamsSchema, 'params'),
  validate(signupBodySchema, 'body'),
  signupForShift
);

/**
 * Route: PATCH /api/shifts/:shiftId/attendance
 * Records or updates attendance status, check-in timestamp, and hours served.
 */
router.patch(
  '/:shiftId/attendance',
  validate(shiftParamsSchema, 'params'),
  validate(attendanceBodySchema, 'body'),
  recordAttendance
);

module.exports = router;
