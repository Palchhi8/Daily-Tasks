const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: null
    }
  },
  { _id: false }
);

const courierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    vehicleType: { type: String, enum: ['BIKE', 'SCOOTER', 'CAR', 'E_BIKE'], default: 'SCOOTER' },
    currentLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    }
  },
  { _id: false }
);

const etaDetailsSchema = new mongoose.Schema(
  {
    estimatedDeliveryTime: {
      type: Date,
      required: true
    },
    estimatedMinutesRemaining: {
      type: Number,
      required: true,
      min: 0
    },
    trafficDelayMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    delayReason: {
      type: String,
      maxlength: 250,
      default: null
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    restaurant: {
      name: { type: String, required: true },
      address: { type: String, required: true }
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      deliveryAddress: { type: String, required: true }
    },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }
      }
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
      index: true
    },
    timeline: [timelineEventSchema],
    courier: {
      type: courierSchema,
      default: null
    },
    eta: {
      type: etaDetailsSchema,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
