const { z } = require('zod');

// Schema for route URL parameters: /api/orders/:orderId/...
const orderParamsSchema = z.object({
  orderId: z
    .string()
    .regex(/^ord_[a-zA-Z0-9_-]{3,24}$/, {
      message: "orderId must follow format 'ord_<identifier>' (3-24 alphanumeric characters)"
    })
});

// Allowed Order Statuses
const validStatuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

// Schema for Order Status Update: PATCH /api/orders/:orderId/status
const orderStatusUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], {
    errorMap: () => ({
      message: "status must be one of: 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'"
    })
  }),
  note: z.string().max(200, { message: 'note cannot exceed 200 characters' }).optional(),
  courier: z
    .object({
      name: z.string().min(2, { message: 'courier.name is required' }),
      phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, {
        message: 'courier.phone must be a valid 10-15 digit phone number'
      }),
      vehicleType: z.enum(['BIKE', 'SCOOTER', 'CAR', 'E_BIKE'], {
        errorMap: () => ({
          message: "vehicleType must be 'BIKE', 'SCOOTER', 'CAR', or 'E_BIKE'"
        })
      }).default('SCOOTER'),
      currentLocation: z
        .object({
          latitude: z.number().min(-90).max(90, { message: 'latitude must be between -90 and 90' }),
          longitude: z.number().min(-180).max(180, { message: 'longitude must be between -180 and 180' })
        })
        .optional()
    })
    .optional()
});

// Schema for Delivery ETA Update: PATCH /api/orders/:orderId/eta
const orderEtaUpdateSchema = z.object({
  estimatedMinutesRemaining: z
    .number({ invalid_type_error: 'estimatedMinutesRemaining must be a number' })
    .min(0, { message: 'estimatedMinutesRemaining cannot be negative' })
    .max(300, { message: 'estimatedMinutesRemaining cannot exceed 300 minutes (5 hours)' }),
  trafficDelayMinutes: z
    .number({ invalid_type_error: 'trafficDelayMinutes must be a number' })
    .min(0, { message: 'trafficDelayMinutes cannot be negative' })
    .default(0),
  delayReason: z
    .string()
    .max(250, { message: 'delayReason cannot exceed 250 characters' })
    .optional(),
  courierLocation: z
    .object({
      latitude: z.number().min(-90).max(90, { message: 'latitude must be between -90 and 90' }),
      longitude: z.number().min(-180).max(180, { message: 'longitude must be between -180 and 180' })
    })
    .optional()
});

module.exports = {
  orderParamsSchema,
  orderStatusUpdateSchema,
  orderEtaUpdateSchema
};
