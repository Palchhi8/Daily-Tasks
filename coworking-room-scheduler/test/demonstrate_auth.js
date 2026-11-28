/**
 * Automated Verification & Demonstration Test Suite
 * Coworking Room Scheduler: Authentication, Authorization & Overlap Prevention
 */
require('dotenv').config();
const http = require('http');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const { resetSeedData } = require('../src/controllers/bookingController');
const mongoose = require('mongoose');

const TEST_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Pretty Terminal Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runDemonstration() {
  console.log(`\n${C.bold}${C.cyan}========================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}   COWORKING ROOM SCHEDULER: AUTH, RBAC & OVERLAP VERIFICATION SUITE   ${C.reset}`);
  console.log(`${C.bold}${C.cyan}========================================================================${C.reset}\n`);

  // Connect to DB and start HTTP test server
  await connectDB();
  await resetSeedData();

  const server = app.listen(TEST_PORT);
  console.log(`${C.dim}[TEST RUNNER] In-memory test server listening on ${BASE_URL}${C.reset}\n`);

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ${C.green}✔ PASS${C.reset} [Test ${totalTests}]: ${C.bold}${testName}${C.reset}`);
      if (details) console.log(`         ${C.dim}${details}${C.reset}`);
    } else {
      console.error(`  ${C.red}✖ FAIL${C.reset} [Test ${totalTests}]: ${C.bold}${testName}${C.reset}`);
      if (details) console.error(`         ${C.red}${details}${C.reset}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: User Registration with bcrypt password hashing
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 1: User Registration & Password Hashing${C.reset}`);
    const regMember = await makeRequest('POST', '/api/auth/register', {
      name: 'Bob Architect',
      email: 'bob.architect@workspace.org',
      password: 'SecurePassword123!',
      role: 'MEMBER'
    });
    assertTest(
      regMember.status === 201 && regMember.body.data.user.email === 'bob.architect@workspace.org',
      'Register new MEMBER account',
      `Status: ${regMember.status}, User ID: ${regMember.body.data?.user?._id}, Password Hashed (never returned)`
    );

    // -------------------------------------------------------------
    // Test 2: User Login & JWT Token Generation
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 2: User Login & JWT Issuance${C.reset}`);
    const loginMember = await makeRequest('POST', '/api/auth/login', {
      email: 'bob.architect@workspace.org',
      password: 'SecurePassword123!'
    });
    const bobToken = loginMember.body.data?.token;
    assertTest(
      loginMember.status === 200 && !!bobToken,
      'Login with valid credentials returns JWT token',
      `Token received (length: ${bobToken?.length}), expiresIn: ${loginMember.body.data?.expiresIn}`
    );

    // -------------------------------------------------------------
    // Test 3: Invalid Credentials Rejection (401)
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 3: Authentication Failure Handling${C.reset}`);
    const badLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'bob.architect@workspace.org',
      password: 'WrongPassword999!'
    });
    assertTest(
      badLogin.status === 401 && badLogin.body.success === false,
      'Login with invalid password rejected (401 Unauthorized)',
      `Status: ${badLogin.status}, Message: "${badLogin.body.message}"`
    );

    // -------------------------------------------------------------
    // Test 4: Protected Route Access Without Token (401)
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 4: Protected Route Verification${C.reset}`);
    const noTokenReq = await makeRequest('GET', '/api/auth/me');
    assertTest(
      noTokenReq.status === 401 && noTokenReq.body.message.includes('missing'),
      'Accessing protected route without Authorization header rejected (401)',
      `Status: ${noTokenReq.status}, Error: ${noTokenReq.body.message}`
    );

    // Access with valid token
    const withTokenReq = await makeRequest('GET', '/api/auth/me', null, bobToken);
    assertTest(
      withTokenReq.status === 200 && withTokenReq.body.data.user.email === 'bob.architect@workspace.org',
      'Accessing protected route with valid Bearer token succeeds (200 OK)',
      `Authenticated as: ${withTokenReq.body.data?.user?.name} [Role: ${withTokenReq.body.data?.tokenClaims?.role}]`
    );

    // -------------------------------------------------------------
    // Test 5: Token Expiration Demonstration (1s Expiry -> 401 TokenExpiredError)
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 5: Token Expiration Lifecycle Verification${C.reset}`);
    const shortExpiryLogin = await makeRequest(
      'POST',
      '/api/auth/login?testExpiry=1s',
      {
        email: 'bob.architect@workspace.org',
        password: 'SecurePassword123!'
      }
    );
    const shortToken = shortExpiryLogin.body.data.token;
    console.log(`  ${C.dim}→ Acquired ephemeral token with 1s expiry. Waiting 1.5 seconds...${C.reset}`);
    await sleep(1500);

    const expiredReq = await makeRequest('GET', '/api/auth/me', null, shortToken);
    assertTest(
      expiredReq.status === 401 && expiredReq.body.message.includes('expired'),
      'Expired JWT token immediately rejected by authenticateToken middleware (401)',
      `Status: ${expiredReq.status}, Message: "${expiredReq.body.message}"`
    );

    // -------------------------------------------------------------
    // Test 6: Room Booking Creation & Overlap Collision Prevention (409 Conflict)
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 6: Resource Booking & Overlap Prevention Check${C.reset}`);
    
    // Alice logs in
    const aliceLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'alice.member@acme.com',
      password: 'MemberPassword123!'
    });
    const aliceToken = aliceLogin.body.data.token;

    // Slot 1: Alice books 10:00 to 12:00 tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const slot1Start = new Date(tomorrow);
    slot1Start.setHours(10, 0, 0, 0);
    const slot1End = new Date(tomorrow);
    slot1End.setHours(12, 0, 0, 0);

    const aliceBooking = await makeRequest(
      'POST',
      '/api/bookings',
      {
        roomId: 'room_conference_a',
        startTime: slot1Start.toISOString(),
        endTime: slot1End.toISOString(),
        purpose: 'Quarterly Product Architecture Review'
      },
      aliceToken
    );

    assertTest(
      aliceBooking.status === 201 && aliceBooking.body.data.status === 'CONFIRMED',
      'Alice successfully books room_conference_a from 10:00 to 12:00 (201 Created)',
      `Booking ID: ${aliceBooking.body.data?.bookingId}, Room: ${aliceBooking.body.data?.roomName}`
    );

    const aliceBookingId = aliceBooking.body.data.bookingId;

    // Bob attempts to book overlapping interval: 11:00 to 13:00 (Overlaps 11:00-12:00)
    const slotOverlapStart = new Date(tomorrow);
    slotOverlapStart.setHours(11, 0, 0, 0);
    const slotOverlapEnd = new Date(tomorrow);
    slotOverlapEnd.setHours(13, 0, 0, 0);

    const overlapAttempt = await makeRequest(
      'POST',
      '/api/bookings',
      {
        roomId: 'room_conference_a',
        startTime: slotOverlapStart.toISOString(),
        endTime: slotOverlapEnd.toISOString(),
        purpose: 'Design System Sprint'
      },
      bobToken
    );

    assertTest(
      overlapAttempt.status === 409 && overlapAttempt.body.statusCode === 409,
      'Bob overlapping booking rejected by interval collision check (409 Conflict)',
      `Status: ${overlapAttempt.status}, Error: ${overlapAttempt.body.message}`
    );

    // Bob books non-overlapping slot: 14:00 to 16:00
    const slotNonOverlapStart = new Date(tomorrow);
    slotNonOverlapStart.setHours(14, 0, 0, 0);
    const slotNonOverlapEnd = new Date(tomorrow);
    slotNonOverlapEnd.setHours(16, 0, 0, 0);

    const bobBooking = await makeRequest(
      'POST',
      '/api/bookings',
      {
        roomId: 'room_conference_a',
        startTime: slotNonOverlapStart.toISOString(),
        endTime: slotNonOverlapEnd.toISOString(),
        purpose: 'Engineering 1-on-1s'
      },
      bobToken
    );

    assertTest(
      bobBooking.status === 201 && bobBooking.body.data.status === 'CONFIRMED',
      'Bob non-overlapping booking succeeds (14:00 to 16:00) (201 Created)',
      `Booking ID: ${bobBooking.body.data?.bookingId}`
    );

    const bobBookingId = bobBooking.body.data.bookingId;

    // -------------------------------------------------------------
    // Test 7: Role-Based Authorization Check (RBAC: ADMIN vs MEMBER)
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 7: Role-Based Authorization Check (RBAC)${C.reset}`);

    // Bob (MEMBER) tries to create a new room -> 403 Forbidden
    const bobCreateRoom = await makeRequest(
      'POST',
      '/api/rooms',
      {
        roomId: 'room_vip_penthouse',
        name: 'VIP Penthouse Lounge',
        capacity: 10,
        hourlyRate: 120.0
      },
      bobToken
    );

    assertTest(
      bobCreateRoom.status === 403 && bobCreateRoom.body.statusCode === 403,
      'MEMBER denied permission to create rooms (403 Forbidden)',
      `Status: ${bobCreateRoom.status}, Error: ${bobCreateRoom.body.message}`
    );

    // Admin logs in
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@coworking.io',
      password: 'AdminPassword123!'
    });
    const adminToken = adminLogin.body.data.token;

    // Admin creates the room -> 201 Created
    const adminCreateRoom = await makeRequest(
      'POST',
      '/api/rooms',
      {
        roomId: 'room_vip_penthouse',
        name: 'VIP Penthouse Lounge',
        capacity: 10,
        amenities: ['Private Balcony', 'High-speed Fiber', 'Espresso Bar'],
        hourlyRate: 120.0
      },
      adminToken
    );

    assertTest(
      adminCreateRoom.status === 201 && adminCreateRoom.body.data.roomId === 'room_vip_penthouse',
      'ADMIN permitted to create new rooms (201 Created)',
      `Room ID: ${adminCreateRoom.body.data?.roomId}, Name: "${adminCreateRoom.body.data?.name}"`
    );

    // -------------------------------------------------------------
    // Test 8: Resource Ownership Check (ABAC / IDOR Protection)
    // -------------------------------------------------------------
    console.log(`\n${C.yellow}► STEP 8: Resource Ownership & IDOR Protection Check${C.reset}`);

    // Bob attempts to cancel Alice's booking -> 403 Forbidden
    const bobCancelAlice = await makeRequest(
      'DELETE',
      `/api/bookings/${aliceBookingId}`,
      null,
      bobToken
    );

    assertTest(
      bobCancelAlice.status === 403 && bobCancelAlice.body.statusCode === 403,
      "Member Bob cannot cancel Alice's booking (403 Forbidden - Ownership Check)",
      `Status: ${bobCancelAlice.status}, Message: "${bobCancelAlice.body.message}"`
    );

    // Alice cancels her own booking -> 200 OK
    const aliceCancelOwn = await makeRequest(
      'DELETE',
      `/api/bookings/${aliceBookingId}`,
      null,
      aliceToken
    );

    assertTest(
      aliceCancelOwn.status === 200 && aliceCancelOwn.body.data.status === 'CANCELLED',
      'Alice successfully cancels her own booking (200 OK - Owner Permitted)',
      `Booking ID: ${aliceCancelOwn.body.data?.bookingId}, Status: ${aliceCancelOwn.body.data?.status}`
    );

    // Admin overrides and cancels Bob's booking -> 200 OK (Admin Override)
    const adminCancelBob = await makeRequest(
      'DELETE',
      `/api/bookings/${bobBookingId}`,
      null,
      adminToken
    );

    assertTest(
      adminCancelBob.status === 200 && adminCancelBob.body.cancelledBy.isAdminOverride === true,
      "Admin Charlie cancels Bob's booking via Admin Override (200 OK)",
      `CancelledBy: ${adminCancelBob.body.cancelledBy?.email}, AdminOverride: ${adminCancelBob.body.cancelledBy?.isAdminOverride}`
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log(`\n${C.bold}${C.cyan}========================================================================${C.reset}`);
    console.log(`${C.bold}${passedTests === totalTests ? C.green : C.red}   TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!   ${C.reset}`);
    console.log(`${C.bold}${C.cyan}========================================================================${C.reset}\n`);

  } catch (err) {
    console.error(`${C.red}Test execution failed:${C.reset}`, err);
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log(`${C.dim}[TEST RUNNER] Database connection closed. Test server stopped.${C.reset}\n`);
  }
}

if (require.main === module) {
  runDemonstration();
}

module.exports = { runDemonstration };
