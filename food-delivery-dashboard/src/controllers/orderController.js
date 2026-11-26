const Order = require('../models/Order');
const AppError = require('../errors/AppError');

// Finite State Machine Allowed Transitions for Order Lifecycle
const ALLOWED_TRANSITIONS = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: []  // Terminal state
};

// Seed dataset for food delivery dashboard in MongoDB Atlas
const INITIAL_ORDERS = [
  {
    orderId: 'ord_pizza_101',
    restaurant: {
      name: 'Bella Napoli Woodfired Pizza',
      address: '742 Evergreen Terrace, Springfield'
    },
    customer: {
      name: 'Homer Simpson',
      email: 'homer.simpson@springfield.net',
      phone: '+1-555-0147',
      deliveryAddress: '742 Evergreen Terrace, Springfield'
    },
    items: [
      { name: 'Large Margherita Pizza', quantity: 2, price: 18.5 },
      { name: 'Garlic Knots with Marinara', quantity: 1, price: 6.0 }
    ],
    totalAmount: 43.0,
    status: 'PREPARING',
    timeline: [
      { status: 'PLACED', timestamp: new Date(Date.now() - 25 * 60000), note: 'Order placed by customer via app' },
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 22 * 60000), note: 'Kitchen accepted order' },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 15 * 60000), note: 'Baking in woodfire oven' }
    ],
    courier: {
      name: 'Carlos Ruiz',
      phone: '+1-555-0819',
      vehicleType: 'E_BIKE',
      currentLocation: { latitude: 37.7749, longitude: -122.4194 }
    },
    eta: {
      estimatedDeliveryTime: new Date(Date.now() + 20 * 60000),
      estimatedMinutesRemaining: 20,
      trafficDelayMinutes: 0,
      delayReason: null,
      lastUpdatedAt: new Date(Date.now() - 10 * 60000)
    }
  },
  {
    orderId: 'ord_sushi_202',
    restaurant: {
      name: 'Sakura Sushi Bar',
      address: '100 Ocean Blvd, Suite 4'
    },
    customer: {
      name: 'Lisa Simpson',
      email: 'lisa.simpson@springfield.edu',
      phone: '+1-555-0182',
      deliveryAddress: '742 Evergreen Terrace, Springfield'
    },
    items: [
      { name: 'Avocado Roll', quantity: 2, price: 8.0 },
      { name: 'Edamame', quantity: 1, price: 4.5 }
    ],
    totalAmount: 20.5,
    status: 'DELIVERED', // Terminal state for testing invalid state machine transition
    timeline: [
      { status: 'PLACED', timestamp: new Date(Date.now() - 60 * 60000), note: 'Order placed' },
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 55 * 60000), note: 'Order accepted' },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 40 * 60000), note: 'Sushi prepared' },
      { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 20 * 60000), note: 'Driver picked up' },
      { status: 'DELIVERED', timestamp: new Date(Date.now() - 5 * 60000), note: 'Handed to customer at door' }
    ],
    courier: {
      name: 'Apu Nahasapeemapetilon',
      phone: '+1-555-0333',
      vehicleType: 'SCOOTER',
      currentLocation: { latitude: 37.7833, longitude: -122.4167 }
    },
    eta: {
      estimatedDeliveryTime: new Date(Date.now() - 5 * 60000),
      estimatedMinutesRemaining: 0,
      trafficDelayMinutes: 0,
      delayReason: null,
      lastUpdatedAt: new Date(Date.now() - 5 * 60000)
    }
  }
];

/**
 * Seeds initial food delivery orders into MongoDB Atlas if collection is empty
 */
async function seedOrdersIfEmpty() {
  const count = await Order.countDocuments({});
  if (count === 0) {
    await Order.insertMany(INITIAL_ORDERS);
    console.log('[DB] Seeded initial food delivery orders into MongoDB Atlas.');
  }
}

/**
 * Resets test seed data in Atlas (used for clean demonstration runs)
 */
async function resetSeedData() {
  await Order.deleteMany({});
  await Order.insertMany(INITIAL_ORDERS);
}

/**
 * Controller: Get live order tracking and current ETA
 * GET /api/orders/:orderId
 */
async function getOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return next(AppError.notFound(`Food delivery order '${orderId}' was not found.`));
    }

    res.status(200).json({
      success: true,
      requestId: req.id,
      data: order
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update order status via State Machine transition
 * PATCH /api/orders/:orderId/status
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status: targetStatus, note, courier } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return next(AppError.notFound(`Food delivery order '${orderId}' was not found.`));
    }

    const currentStatus = order.status;

    // Check if the order is already in a terminal state
    if (ALLOWED_TRANSITIONS[currentStatus].length === 0) {
      return next(
        AppError.conflict(
          `Cannot update order '${orderId}'. Current status is terminal '${currentStatus}'. No further transitions permitted.`
        )
      );
    }

    // Enforce Finite State Machine validity
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedNext.includes(targetStatus)) {
      return next(
        AppError.badRequest(
          `Invalid state transition: Cannot change status from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowedNext.join(
            ', '
          )}]`
        )
      );
    }

    // Apply status update
    order.status = targetStatus;
    order.timeline.push({
      status: targetStatus,
      timestamp: new Date(),
      note: note || `Order status updated to ${targetStatus}`
    });

    // If courier details provided or status changed to OUT_FOR_DELIVERY
    if (courier) {
      order.courier = courier;
    }

    // If order reached DELIVERED, adjust ETA to 0 minutes remaining
    if (targetStatus === 'DELIVERED') {
      order.eta.estimatedMinutesRemaining = 0;
      order.eta.estimatedDeliveryTime = new Date();
      order.eta.lastUpdatedAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      requestId: req.id,
      message: `Order '${orderId}' status successfully transitioned from '${currentStatus}' to '${targetStatus}'.`,
      data: {
        orderId: order.orderId,
        previousStatus: currentStatus,
        currentStatus: order.status,
        timeline: order.timeline,
        courier: order.courier,
        eta: order.eta
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update delivery ETA and driver tracking
 * PATCH /api/orders/:orderId/eta
 */
async function updateOrderEta(req, res, next) {
  try {
    const { orderId } = req.params;
    const { estimatedMinutesRemaining, trafficDelayMinutes = 0, delayReason, courierLocation } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return next(AppError.notFound(`Food delivery order '${orderId}' was not found.`));
    }

    // Cannot update ETA for orders that are already DELIVERED or CANCELLED
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return next(
        AppError.conflict(
          `Cannot update ETA for order '${orderId}' because order is already '${order.status}'.`
        )
      );
    }

    // Calculate updated timestamp
    const now = Date.now();
    const totalMinutes = estimatedMinutesRemaining + trafficDelayMinutes;
    const newDeliveryTime = new Date(now + totalMinutes * 60000);

    order.eta = {
      estimatedDeliveryTime: newDeliveryTime,
      estimatedMinutesRemaining: totalMinutes,
      trafficDelayMinutes,
      delayReason: delayReason || null,
      lastUpdatedAt: new Date()
    };

    if (courierLocation && order.courier) {
      order.courier.currentLocation = courierLocation;
    }

    await order.save();

    res.status(200).json({
      success: true,
      requestId: req.id,
      message: `Delivery ETA for order '${orderId}' updated to ${totalMinutes} minutes remaining.`,
      data: {
        orderId: order.orderId,
        status: order.status,
        eta: order.eta,
        courier: order.courier
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrder,
  updateOrderStatus,
  updateOrderEta,
  seedOrdersIfEmpty,
  resetSeedData
};
