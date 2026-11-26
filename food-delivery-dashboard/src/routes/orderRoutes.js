const express = require('express');
const validate = require('../middleware/validate');
const {
  orderParamsSchema,
  orderStatusUpdateSchema,
  orderEtaUpdateSchema
} = require('../validators/orderValidators');
const {
  getOrder,
  updateOrderStatus,
  updateOrderEta
} = require('../controllers/orderController');

const router = express.Router();

/**
 * Route: GET /api/orders/:orderId
 * Retrieves real-time delivery order details, timeline, and current ETA.
 */
router.get(
  '/:orderId',
  validate(orderParamsSchema, 'params'),
  getOrder
);

/**
 * Route: PATCH /api/orders/:orderId/status
 * Updates order status through state machine validation (PLACED -> CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED).
 */
router.patch(
  '/:orderId/status',
  validate(orderParamsSchema, 'params'),
  validate(orderStatusUpdateSchema, 'body'),
  updateOrderStatus
);

/**
 * Route: PATCH /api/orders/:orderId/eta
 * Updates remaining delivery ETA, traffic delay factors, and live courier coordinates.
 */
router.patch(
  '/:orderId/eta',
  validate(orderParamsSchema, 'params'),
  validate(orderEtaUpdateSchema, 'body'),
  updateOrderEta
);

module.exports = router;
