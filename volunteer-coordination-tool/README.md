# Volunteer Coordination API: Middleware, Validation & Error Handling

An Express.js REST API prototype built for a **Volunteer Coordination Tool** managing **shift signups** and **volunteer attendance tracking**.

---

## 1. Quick Start & Setup

### Prerequisites
- Node.js (v18.x or v20.x+)
- npm (v9.x+)

### Installation & Run
```bash
# Navigate to the project directory
cd volunteer-coordination-tool

# Install dependencies (Express & Zod)
npm install

# Start the API server on port 3000
npm start

# Run the automated demonstration test suite (tests 10 valid & invalid cases)
npm test
```

---

## 2. Architecture & Design Decisions

### 2.1 Custom Request ID Middleware (`src/middleware/requestId.js`)
- **Decision:** Attaches a unique UUID v4 to each request via `crypto.randomUUID()` (Node.js native, no external dependencies).
- **Distributed Tracing:** If an upstream client or API gateway passes an existing `X-Request-Id` header, the middleware adopts it; otherwise, it generates a fresh one.
- **Client Visibility:** Sets the response header `X-Request-Id` so clients can quote the exact ID when reporting issues.

### 2.2 Custom Structured Request Logger (`src/middleware/requestLogger.js`)
- **Decision:** Hooks into `res.on('finish')` using high-resolution timers (`process.hrtime()`).
- **Correlation:** Every log line is tagged with `[${req.id}]`, allowing operators to grep or filter all logs belonging to a single transaction in high-concurrency environments.
- **Metrics Logged:** HTTP Method, URL path, response status code, status category (OK / WARN / ERROR), and execution latency in milliseconds.

### 2.3 Declarative Input Validation (`src/middleware/validate.js` + Zod)
- **Decision:** Built a reusable higher-order middleware `validate(schema, 'body'|'params'|'query')`.
- **Field-Level Error Formatting:** Extracts Zod validation issues and normalizes them into clean `{ field, message, rule }` objects.
- **Fail-Fast Boundary:** Invalid requests are rejected before reaching controller business logic, passing an operational `AppError(400)` to `next()`.

### 2.4 Centralized Error Handling (`src/middleware/errorHandler.js` + `AppError.js`)
- **Decision:** Single error handling middleware registered at the end of the Express middleware pipeline `(err, req, res, next)`.
- **Operational vs Programmatic Errors:**
  - Operational errors (`AppError`: 400 Bad Request, 404 Not Found, 409 Conflict) return controlled status codes and friendly messages.
  - Express body-parser syntax errors (malformed JSON) are caught and formatted as 400 Bad Request.
  - Unhandled 500 server crashes are logged with full stacks on the server but shielded from clients.
- **Standardized Error Envelope:**
  ```json
  {
    "success": false,
    "status": "fail",
    "statusCode": 400,
    "message": "Validation failed for body",
    "requestId": "680e7043-7d52-4eb2-8b8c-3830d4501772",
    "timestamp": "2026-11-25T09:13:53.577Z",
    "errors": [
      {
        "field": "email",
        "message": "A valid email address is required",
        "rule": "invalid_format"
      }
    ]
  }
  ```

---

## 3. Endpoints & Context Implementation

| Method | Endpoint | Description | Validation / Rules |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/shifts/:shiftId` | Get shift details and available volunteer capacity | `shiftId` format regex: `^shift_[a-zA-Z0-9_-]{3,24}$` |
| `POST` | `/api/shifts/:shiftId/signup` | Volunteer registers for a shift | Validates email, 10-15 digit phone, required emergency contact, role preference enum. Enforces capacity and duplicate prevention (409 Conflict). |
| `PATCH` | `/api/shifts/:shiftId/attendance` | Coordinator logs attendance and hours | Validates status enum (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), hours served ($0 \le \text{hours} \le 24$). |

---

## 4. Demonstrated Test Cases (`test/demonstrate_requests.js`)

Running `npm test` automatically exercises the following 10 test scenarios:

| # | Test Scenario | HTTP Status | Middleware / Logic Exercised |
| :---: | :--- | :---: | :--- |
| **1** | Query Shift Details | `200 OK` | `requestId` header injection, controller retrieval |
| **2** | Valid Volunteer Signup | `201 Created` | Full payload validation, capacity decrement |
| **3** | Malformed Signup Payload | `400 Bad Request` | Zod validation: bad email, short name, missing emergency contact |
| **4** | Invalid URL Parameter Format | `400 Bad Request` | Param validation: `shiftId` regex check |
| **5** | Non-Existent Shift ID | `404 Not Found` | Controller domain check via `AppError.notFound` |
| **6** | Shift at Maximum Capacity | `409 Conflict` | Domain rule: capacity guard prevents over-booking |
| **7** | Duplicate Volunteer Registration | `409 Conflict` | Domain rule: prevents duplicate volunteer signup on same shift |
| **8** | Valid Attendance Check-In | `200 OK` | Attendance update, ISO timestamp capture, hours calculation |
| **9** | Invalid Attendance Payload | `400 Bad Request` | Enum validation (`SLACKING_OFF` rejected) & negative hours ($< 0$) |
| **10**| Undefined Route Catch-All | `404 Not Found` | Fallback 404 middleware with standardized error envelope |
