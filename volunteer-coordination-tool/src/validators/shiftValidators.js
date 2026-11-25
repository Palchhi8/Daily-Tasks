const { z } = require('zod');

// Schema for route URL parameters: /api/shifts/:shiftId/...
const shiftParamsSchema = z.object({
  shiftId: z
    .string()
    .regex(/^shift_[a-zA-Z0-9_-]{3,24}$/, {
      message: "shiftId must follow format 'shift_<identifier>' (3-24 alphanumeric characters)"
    })
});

// Schema for Shift Signup: POST /api/shifts/:shiftId/signup
const signupBodySchema = z.object({
  volunteerId: z
    .string()
    .min(3, { message: 'volunteerId must be at least 3 characters' })
    .max(50, { message: 'volunteerId cannot exceed 50 characters' }),
  fullName: z
    .string()
    .min(2, { message: 'fullName must be at least 2 characters' })
    .max(100, { message: 'fullName cannot exceed 100 characters' }),
  email: z
    .string()
    .email({ message: 'A valid email address is required' }),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{10,15}$/, {
      message: 'phone must be a valid 10-15 digit phone number (e.g. +1-555-0199 or 5550199222)'
    }),
  rolePreference: z
    .enum(['CHECK_IN', 'FOOD_DISTRIBUTION', 'SETUP_TEARDOWN', 'TUTORING', 'GENERAL_ASSISTANCE'], {
      errorMap: () => ({
        message: 'rolePreference must be one of: CHECK_IN, FOOD_DISTRIBUTION, SETUP_TEARDOWN, TUTORING, GENERAL_ASSISTANCE'
      })
    })
    .default('GENERAL_ASSISTANCE'),
  emergencyContact: z.object({
    name: z.string().min(2, { message: 'emergencyContact.name is required' }),
    phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, {
      message: 'emergencyContact.phone must be a valid phone number'
    })
  }),
  notes: z.string().max(300, { message: 'notes cannot exceed 300 characters' }).optional()
});

// Schema for Attendance Tracking: PATCH /api/shifts/:shiftId/attendance
const attendanceBodySchema = z.object({
  volunteerId: z
    .string()
    .min(3, { message: 'volunteerId is required' }),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], {
    errorMap: () => ({
      message: "status must be one of: 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'"
    })
  }),
  checkInTime: z
    .string()
    .datetime({ message: 'checkInTime must be a valid ISO-8601 date timestamp' })
    .optional(),
  hoursServed: z
    .number({ invalid_type_error: 'hoursServed must be a number' })
    .min(0, { message: 'hoursServed cannot be negative' })
    .max(24, { message: 'hoursServed cannot exceed 24 hours per shift' })
    .optional(),
  coordinatorNotes: z
    .string()
    .max(300, { message: 'coordinatorNotes cannot exceed 300 characters' })
    .optional()
});

module.exports = {
  shiftParamsSchema,
  signupBodySchema,
  attendanceBodySchema
};
