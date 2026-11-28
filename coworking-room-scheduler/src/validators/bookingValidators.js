const { z } = require('zod');

const createBookingSchema = z
  .object({
    roomId: z.string().min(3, { message: 'roomId is required' }),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO-8601 date string' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO-8601 date string' }),
    purpose: z
      .string()
      .min(3, { message: 'purpose must be at least 3 characters' })
      .max(200, { message: 'purpose cannot exceed 200 characters' })
  })
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'endTime must be chronologically after startTime',
      path: ['endTime']
    }
  );

const bookingParamsSchema = z.object({
  bookingId: z
    .string()
    .regex(/^bk_[a-zA-Z0-9_-]{3,24}$/, {
      message: "bookingId must match format 'bk_<identifier>'"
    })
});

module.exports = {
  createBookingSchema,
  bookingParamsSchema
};
