/**
 * Demonstration Script: Valid and Invalid Express Requests
 * Food Delivery Dashboard Context: Order Status & Delivery ETA Updates
 * Tests custom Request ID, Logger, Zod Input Validation, Centralized Error Handling,
 * and State Machine logic live against MongoDB Atlas.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const { resetSeedData } = require('../src/controllers/orderController');

const PORT = 3088;
let server;

async function runRequest(name, method, path, body = null, customHeaders = {}) {
  console.log('\n' + '='.repeat(70));
  console.log(`TEST CASE: ${name}`);
  console.log(`REQUEST:   ${method} http://localhost:${PORT}${path}`);
  if (body) {
    console.log(`PAYLOAD:   ${JSON.stringify(body, null, 2)}`);
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`http://localhost:${PORT}${path}`, options);
  const data = await res.json().catch(() => ({}));

  console.log(`RESPONSE:  HTTP ${res.status} ${res.statusText}`);
  console.log(`HEADER:    X-Request-Id: ${res.headers.get('x-request-id')}`);
  console.log(`BODY:      ${JSON.stringify(data, null, 2)}`);

  return { status: res.status, headers: res.headers, data };
}

async function main() {
  console.log('Connecting to MongoDB Atlas (food_delivery_db)...');
  await connectDB();
  console.log('Resetting test seed orders in MongoDB Atlas...');
  await resetSeedData();

  server = app.listen(PORT, () => {
    console.log(`Food delivery test server running on port ${PORT}`);
  });

  try {
    // -------------------------------------------------------------
    // 1. VALID: Query Live Order Tracking and Current ETA
    // -------------------------------------------------------------
    await runRequest(
      '1. [VALID] Fetch Live Order Tracking & Initial ETA (from MongoDB Atlas)',
      'GET',
      '/api/orders/ord_pizza_101'
    );

    // -------------------------------------------------------------
    // 2. VALID: Order Status Transition (PREPARING -> OUT_FOR_DELIVERY)
    // -------------------------------------------------------------
    const statusTransitionPayload = {
      status: 'OUT_FOR_DELIVERY',
      note: 'Driver picked up pizza from restaurant kitchen',
      courier: {
        name: 'Carlos Ruiz',
        phone: '+1-555-0819',
        vehicleType: 'E_BIKE',
        currentLocation: { latitude: 37.7749, longitude: -122.4194 }
      }
    };
    await runRequest(
      '2. [VALID] Transition Status to OUT_FOR_DELIVERY with Courier Details',
      'PATCH',
      '/api/orders/ord_pizza_101/status',
      statusTransitionPayload
    );

    // -------------------------------------------------------------
    // 3. VALID: Dynamic Delivery ETA Update (with Traffic Delays & GPS)
    // -------------------------------------------------------------
    const etaUpdatePayload = {
      estimatedMinutesRemaining: 15,
      trafficDelayMinutes: 5,
      delayReason: 'Downtown bridge construction slowdown',
      courierLocation: { latitude: 37.7765, longitude: -122.4180 }
    };
    await runRequest(
      '3. [VALID] Update Delivery ETA with Traffic Delay and GPS Coordinates',
      'PATCH',
      '/api/orders/ord_pizza_101/eta',
      etaUpdatePayload
    );

    // -------------------------------------------------------------
    // 4. VALID: Final Order Status Transition (OUT_FOR_DELIVERY -> DELIVERED)
    // -------------------------------------------------------------
    const deliverPayload = {
      status: 'DELIVERED',
      note: 'Package handed to customer at front porch'
    };
    await runRequest(
      '4. [VALID] Transition Status to DELIVERED (Terminal State - ETA auto-resets)',
      'PATCH',
      '/api/orders/ord_pizza_101/status',
      deliverPayload
    );

    // -------------------------------------------------------------
    // 5. INVALID: State Machine Violation (Terminal State Transition Attempt)
    // -------------------------------------------------------------
    const invalidTerminalTransition = {
      status: 'PREPARING',
      note: 'Attempting to re-cook already delivered food'
    };
    await runRequest(
      '5. [INVALID] Transition on Terminal Order State DELIVERED (State Machine Conflict 409)',
      'PATCH',
      '/api/orders/ord_sushi_202/status',
      invalidTerminalTransition
    );

    // -------------------------------------------------------------
    // 6. INVALID: Unrecognized Status Enum (Zod Input Validation 400)
    // -------------------------------------------------------------
    const invalidStatusEnum = {
      status: 'COOKING_IN_OVEN', // Invalid enum
      note: 'Custom invalid status string'
    };
    await runRequest(
      '6. [INVALID] Order Status Update with Invalid Enum Value (Validation Error 400)',
      'PATCH',
      '/api/orders/ord_pizza_101/status',
      invalidStatusEnum
    );

    // -------------------------------------------------------------
    // 7. INVALID: URL Parameter Format Regex Failure (Validation 400)
    // -------------------------------------------------------------
    await runRequest(
      '7. [INVALID] Order ID Parameter Fails Regex Format (Validation Error 400)',
      'GET',
      '/api/orders/INVALID_ORDER_ID!@#'
    );

    // -------------------------------------------------------------
    // 8. INVALID: Non-Existent Order ID (Operational 404 Not Found)
    // -------------------------------------------------------------
    await runRequest(
      '8. [INVALID] Non-Existent Order ID (Operational 404 Not Found from Atlas)',
      'GET',
      '/api/orders/ord_unknown_999'
    );

    // -------------------------------------------------------------
    // 9. INVALID: Negative ETA and Invalid GPS Coordinates (Validation 400)
    // -------------------------------------------------------------
    const invalidEtaPayload = {
      estimatedMinutesRemaining: -10, // Negative minutes (< 0)
      trafficDelayMinutes: -5,        // Negative delay
      courierLocation: {
        latitude: 150.0,  // Latitude out of range (> 90)
        longitude: -250.0 // Longitude out of range (< -180)
      }
    };
    await runRequest(
      '9. [INVALID] Delivery ETA Update with Negative Minutes & Invalid Coordinates (Validation 400)',
      'PATCH',
      '/api/orders/ord_pizza_101/eta',
      invalidEtaPayload
    );

    // -------------------------------------------------------------
    // 10. INVALID: Catch-All Undefined Endpoint (Operational 404)
    // -------------------------------------------------------------
    await runRequest(
      '10. [INVALID] Catch-All for Non-Existent Delivery Endpoint (Operational 404)',
      'GET',
      '/api/orders/ord_pizza_101/unknown-subroute'
    );

    console.log('\n' + '='.repeat(70));
    console.log('ALL FOOD DELIVERY DASHBOARD TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70) + '\n');
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  mongoose.connection.close();
  process.exit(1);
});
