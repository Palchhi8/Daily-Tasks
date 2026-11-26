# Food Delivery Dashboard API: Middleware, Validation & Live MongoDB Atlas

An Express.js REST API built for a **Food Delivery Dashboard** managing **real-time order status tracking** and **dynamic delivery ETA updates**.

**Database:** Live MongoDB Atlas Cloud Cluster (`cluster0.kwbl0mw.mongodb.net` / Database: `food_delivery_db`) via Mongoose.

---

## 1. Quick Start & Setup

### Prerequisites
- Node.js (v18.x or v20.x+)
- npm (v9.x+)

### Installation & Run
```bash
# Navigate to the project directory
cd food-delivery-dashboard

# Install dependencies (Express, Mongoose, Zod, Dotenv)
npm install

# Start the API server on port 3000 (connects to MongoDB Atlas)
npm start

# Run the automated demonstration test suite against MongoDB Atlas
npm test
```

### Environment Configuration (`.env`)
The service connects to your MongoDB Atlas cluster using `.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://jainpalchhi2k6_db_user:TeCS9Z2UAj3GKlQg@cluster0.kwbl0mw.mongodb.net/food_delivery_db?retryWrites=true&w=majority
NODE_ENV=development
```

---

## 2. Architecture & Middleware Decisions

```
Incoming Request
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 1. Request ID Middleware (src/middleware/requestId.js) │
│    - Accepts or creates UUID v4 via crypto.randomUUID  │
│    - Attaches req.id and sets X-Request-Id header      │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Structured Logger (src/middleware/requestLogger.js) │
│    - Tags logs with [req.id] for distributed tracing   │
│    - Hooks res.on('finish') to log latency ms & status │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Express Body Parser (express.json())                │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Zod Validation Middleware (src/middleware/validate) │
│    - Validates req.params and req.body against schema  │
│    - Rejects invalid data with detailed field issues   │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. Order Controller & State Machine                    │
│    - Enforces Finite State Machine (PLACED -> ... )    │
│    - Dynamic ETA calculation (traffic + GPS updates)   │
│    - Atomic persistence in MongoDB Atlas               │
└──────────────────────────┬─────────────────────────────┘
                           ▼ (errors caught via next(err))
┌────────────────────────────────────────────────────────┐
│ 6. Centralized Error Handler (src/middleware/error...) │
│    - Unifies 400 Validation, 404 Not Found, 409, 500   │
│    - Standardized RFC 7807-compatible error envelopes  │
└────────────────────────────────────────────────────────┘
```

### 2.1 Custom Request ID Middleware (`src/middleware/requestId.js`)
- Generates a cryptographically secure UUID v4 using Node.js built-in `crypto.randomUUID()`.
- Supports distributed tracing by adopting any existing incoming `X-Request-Id` header (from API gateways or load balancers).
- Sets `X-Request-Id` on the outgoing response header.

### 2.2 Custom Structured Request Logger (`src/middleware/requestLogger.js`)
- Correlates all log lines by `[${req.id}]` across high-concurrency environments.
- Uses high-resolution timers (`process.hrtime()`) on `res.on('finish')` to log HTTP method, path, response status, and duration in milliseconds.

### 2.3 Declarative Input Validation (`src/middleware/validate.js` + Zod)
- Built a reusable higher-order middleware `validate(schema, 'body'|'params'|'query')`.
- Formats field-level validation errors into clean `{ field, message, rule }` objects.
- Forwards validation failures to `next(AppError.badRequest(...))` to maintain a single error handling path.

### 2.4 Centralized Error Handling (`src/middleware/errorHandler.js` + `AppError.js`)
- Standardizes all error responses (400, 404, 409, 500) into a consistent JSON envelope containing `success: false`, `statusCode`, `message`, `requestId`, and `timestamp`.
- Catches Express body-parser malformed JSON errors as 400 Bad Request.
- Shields sensitive internal stack traces from clients in production.

---

## 3. Finite State Machine for Order Lifecycle

To prevent invalid transitions (e.g., trying to re-cook an already delivered pizza):

```
[PLACED] ──► [CONFIRMED] ──► [PREPARING] ──► [OUT_FOR_DELIVERY] ──► [DELIVERED] (Terminal)
   │               │               │                  │
   └───────────────┴───────────────┴──────────────────┴────────────► [CANCELLED] (Terminal)
```

Attempts to transition from a terminal state (`DELIVERED` or `CANCELLED`) automatically return **409 Conflict**.

---

## 4. Endpoints Implemented

| Method | Endpoint | Purpose | Key Validations & Rules |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders/:orderId` | Live Order Tracking & ETA | Validates `orderId` regex (`^ord_[a-zA-Z0-9_-]{3,24}$`). Returns current status, timeline, courier, and ETA. |
| `PATCH` | `/api/orders/:orderId/status` | Update Order Status | Validates status enum, courier info (for `OUT_FOR_DELIVERY`), and enforces state machine transitions. Auto-resets ETA to 0 on delivery. |
| `PATCH` | `/api/orders/:orderId/eta` | Update Delivery ETA | Validates non-negative minutes ($0 \le \text{mins} \le 300$), non-negative traffic delay, and GPS latitude ($-90 \le \text{lat} \le 90$) / longitude ($-180 \le \text{lon} \le 180$). |

---

## 5. Architectural Trade-Off Note

> [!NOTE]
> ### 1. Hybrid State-and-Timeline vs Pure Event-Sourcing
> In food delivery platforms, consumer dashboards poll or listen for current order status and ETA.  
> - **Pure Event-Sourcing Approach:** Storing only discrete events (`OrderPlaced`, `StatusChanged`, `EtaAdjusted`) requires folding/aggregating the event stream on every dashboard read, adding CPU and latency overhead.  
> - **Chosen Hybrid Approach:** We maintain the latest state (`status`, `eta`, `courier`) directly on the root `Order` document for instant $O(1)$ single-document reads, while appending historical transitions into an embedded `timeline` array.  
> - **Trade-Off:** This slightly increases document write payload on each status update, but ensures sub-millisecond query responses for mobile dashboards and driver apps without requiring heavy stream aggregation.

> [!TIP]
> ### 2. Declarative Middleware Validation vs Database Schema Constraints
> - **Validation in Express Middleware (Zod):** Evaluates incoming payloads at the application boundary before any controller logic or database roundtrips occur.  
> - **Trade-Off:** Handling validation in Express middleware adds a few microseconds of CPU time in Node.js, but prevents invalid traffic from ever touching MongoDB Atlas, saving network bandwidth and cluster connection pool slots.

---

## 6. Demonstrated Test Output & Verification

Running `npm test` automatically exercises the following 10 test scenarios:

| # | Test Scenario | HTTP Status | Middleware / Logic Exercised |
| :---: | :--- | :---: | :--- |
| **1** | Fetch Live Order Tracking & Initial ETA | `200 OK` | Route retrieval from MongoDB Atlas + `X-Request-Id` |
| **2** | Status: `PREPARING` $\rightarrow$ `OUT_FOR_DELIVERY` | `200 OK` | State machine transition + courier GPS logging |
| **3** | Dynamic ETA Update with Traffic Delays | `200 OK` | Computes updated delivery timestamp and delay reason |
| **4** | Status: `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED` | `200 OK` | Terminal state transition; ETA auto-resets to 0 mins |
| **5** | State Machine Violation on Terminal State | `409 Conflict` | Rejects modifying already `DELIVERED` order |
| **6** | Invalid Status Enum (`COOKING_IN_OVEN`) | `400 Bad Request` | Zod validation: rejects unrecognized enum value |
| **7** | Malformed Order ID Format | `400 Bad Request` | Regex param validation: `orderId` format check |
| **8** | Non-Existent Order ID | `404 Not Found` | Operational domain check via `AppError.notFound` |
| **9** | Negative ETA & Invalid GPS Coordinates | `400 Bad Request` | Multi-field validation: negative minutes & out-of-range coords |
| **10**| Undefined Route Catch-All | `404 Not Found` | Centralized 404 middleware with standardized error envelope |

- **Screenshot File:** [food_delivery_test_screenshot.png](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/food-delivery-dashboard/food_delivery_test_screenshot.png)
