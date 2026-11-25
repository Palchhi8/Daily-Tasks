/**
 * Demonstration Script: Valid and Invalid Express Requests
 * Tests all middleware (Request ID, Logging, Validation, Centralized Error Handling)
 * and Volunteer Coordination domain logic connected to MongoDB Atlas.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const { resetSeedData } = require('../src/controllers/shiftController');

const PORT = 3055;
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
  console.log('Connecting to MongoDB Atlas (volunteer_coordination_db)...');
  await connectDB();
  console.log('Resetting test seed data in MongoDB Atlas...');
  await resetSeedData();

  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    // -------------------------------------------------------------
    // 1. VALID: Query Existing Shift Details
    // -------------------------------------------------------------
    await runRequest(
      '1. [VALID] Query Shift Details and Remaining Capacity (from Atlas)',
      'GET',
      '/api/shifts/shift_food_drive_101'
    );

    // -------------------------------------------------------------
    // 2. VALID: Volunteer Signs Up for Available Shift
    // -------------------------------------------------------------
    const validSignup = {
      volunteerId: 'vol_diana_04',
      fullName: 'Diana Prince',
      email: 'diana.prince@example.org',
      phone: '+1-555-0199',
      rolePreference: 'FOOD_DISTRIBUTION',
      emergencyContact: {
        name: 'Hippolyta Prince',
        phone: '+1-555-0100'
      },
      notes: 'Available for entire 4-hour morning shift.'
    };
    await runRequest(
      '2. [VALID] Volunteer Shift Signup with Full Valid Payload (Saved to Atlas)',
      'POST',
      '/api/shifts/shift_food_drive_101/signup',
      validSignup
    );

    // -------------------------------------------------------------
    // 3. INVALID: Missing & Malformed Fields (Input Validation 400)
    // -------------------------------------------------------------
    const invalidSignup = {
      volunteerId: 'v', // Too short (< 3)
      fullName: '',     // Blank
      email: 'not-an-email-address', // Malformed email
      phone: '1234',    // Invalid phone regex (< 10 digits)
      rolePreference: 'SUPERHERO_WORK', // Invalid enum
      // Missing emergencyContact object
      notes: 'A'.repeat(350) // Exceeds max 300 chars
    };
    await runRequest(
      '3. [INVALID] Shift Signup - Malformed Fields & Missing Required Data (Validation Error 400)',
      'POST',
      '/api/shifts/shift_food_drive_101/signup',
      invalidSignup
    );

    // -------------------------------------------------------------
    // 4. INVALID: URL Parameter Regex Violation (Validation 400)
    // -------------------------------------------------------------
    await runRequest(
      '4. [INVALID] URL Parameter Fails Regex Format (Validation Error 400)',
      'GET',
      '/api/shifts/INVALID_ID!@#'
    );

    // -------------------------------------------------------------
    // 5. INVALID: Non-Existent Shift (Not Found 404)
    // -------------------------------------------------------------
    await runRequest(
      '5. [INVALID] Non-Existent Shift ID (Operational 404 Not Found from Atlas)',
      'POST',
      '/api/shifts/shift_unknown_999/signup',
      validSignup
    );

    // -------------------------------------------------------------
    // 6. INVALID: Capacity Exceeded (Conflict 409)
    // -------------------------------------------------------------
    const signupAtCapacity = {
      volunteerId: 'vol_edward_05',
      fullName: 'Edward Nygma',
      email: 'edward.n@example.org',
      phone: '+1-555-0211',
      emergencyContact: {
        name: 'Dr. Arkham',
        phone: '+1-555-0299'
      }
    };
    await runRequest(
      '6. [INVALID] Signup on Shift At Full Capacity (Conflict 409)',
      'POST',
      '/api/shifts/shift_park_cleanup_202/signup',
      signupAtCapacity
    );

    // -------------------------------------------------------------
    // 7. INVALID: Duplicate Volunteer Registration (Conflict 409)
    // -------------------------------------------------------------
    await runRequest(
      '7. [INVALID] Duplicate Volunteer Registration (Conflict 409)',
      'POST',
      '/api/shifts/shift_food_drive_101/signup',
      validSignup // Diana already signed up in step 2
    );

    // -------------------------------------------------------------
    // 8. VALID: Record Attendance Check-In
    // -------------------------------------------------------------
    const validAttendance = {
      volunteerId: 'vol_diana_04',
      status: 'PRESENT',
      checkInTime: new Date().toISOString(),
      hoursServed: 4.0,
      coordinatorNotes: 'Arrived promptly at 09:00, excellent coordination.'
    };
    await runRequest(
      '8. [VALID] Record Volunteer Attendance & Check-In (Updated in Atlas)',
      'PATCH',
      '/api/shifts/shift_food_drive_101/attendance',
      validAttendance
    );

    // -------------------------------------------------------------
    // 9. INVALID: Invalid Attendance Status & Negative Hours (Validation 400)
    // -------------------------------------------------------------
    const invalidAttendance = {
      volunteerId: 'vol_diana_04',
      status: 'SLACKING_OFF', // Invalid enum
      hoursServed: -5.0        // Negative hours (< 0)
    };
    await runRequest(
      '9. [INVALID] Attendance Tracking with Invalid Status & Negative Hours (Validation 400)',
      'PATCH',
      '/api/shifts/shift_food_drive_101/attendance',
      invalidAttendance
    );

    // -------------------------------------------------------------
    // 10. INVALID: Catch-All Undefined Route (404)
    // -------------------------------------------------------------
    await runRequest(
      '10. [INVALID] Catch-All for Non-Existent Route (Operational 404)',
      'GET',
      '/api/non-existent-endpoint'
    );

    console.log('\n' + '='.repeat(70));
    console.log('ALL DEMONSTRATION TESTS COMPLETED SUCCESSFULLY AGAINST MONGODB ATLAS!');
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
