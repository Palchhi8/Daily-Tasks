# MongoDB Schema Design, Validation & Indexing: Library Lending System

**Domain Context:** Library Lending System  
**Core Workflows:** Real-time Book Availability, Patron Hold Queues, and Automated Overdue Reminders  
**Database Engine:** MongoDB 7.0+ (WiredTiger Engine)

---

## 1. Domain Architecture & Problem Statement

A modern library lending platform manages three critical operational workflows:
1. **Book Availability Tracking:** Patrons frequently browse or search the catalog (e.g., filtering by genre or author) and expect instantaneous feedback on whether copies are physically available on shelf (`availableCopies > 0`).
2. **Holds Queue Management:** When all physical copies of a title are checked out (`availableCopies == 0`), patrons can place a hold. The hold queue must operate in first-come, first-served (FIFO) sequence, preserving reservation timestamps and readiness status.
3. **Automated Overdue Reminders:** A background daemon/cron worker periodically queries the lending records to find active loans whose `dueDate` has passed or is fast approaching. The system dispatches automated reminder notifications (email/SMS) and records reminder delivery metadata to enforce policy limits (e.g., maximum 3 reminders before penalty assessment).

---

## 2. Related Entities & Schema Draft

To balance read performance, write throughput, and data integrity without triggering document growth anti-patterns, the system models two primary collections: `books` and `loans`.

### 2.1 Entity 1: `books` (Catalog, Inventory & Bounded Holds)
Represents title-level bibliographic metadata, real-time inventory counts, and an embedded bounded queue of active patron holds.

```javascript
{
  "_id": ObjectId("6560fa31b1d8f3412a800001"),
  "isbn": "978-0141439518",
  "title": "Pride and Prejudice",
  "author": "Jane Austen",
  "genres": ["Classic", "Romance", "Literature"],
  "publicationYear": 1813,
  "totalCopies": 5,
  "availableCopies": 4,
  "holdsQueue": [
    {
      "patronId": "patron_USR_8821",
      "holdPlacedAt": ISODate("2026-11-20T10:15:00.000Z"),
      "status": "WAITING" // Allowed: "WAITING", "READY_FOR_PICKUP", "EXPIRED"
    }
  ],
  "createdAt": ISODate("2026-01-15T08:00:00.000Z"),
  "updatedAt": ISODate("2026-11-25T14:10:00.000Z")
}
```

### 2.2 Entity 2: `loans` (Lending Transactions & Reminder Lifecycle)
Represents checkout transactions, due dates, item copies, return states, and reminder notification counters.

```javascript
{
  "_id": ObjectId("6560fa32b1d8f3412a800002"),
  "bookId": ObjectId("6560fa31b1d8f3412a800001"),
  "patronId": "patron_USR_1001",
  "copyBarcode": "BARCODE-P&P-01",
  "checkoutDate": ISODate("2026-11-10T14:00:00.000Z"),
  "dueDate": ISODate("2026-11-24T23:59:59.000Z"),
  "returnDate": null,
  "status": "OVERDUE", // Allowed: "ACTIVE", "RETURNED", "OVERDUE", "LOST"
  "reminders": {
    "count": 1,
    "lastSentAt": ISODate("2026-11-25T08:00:00.000Z")
  }
}
```

---

## 3. Relationship Strategy Analysis

### Pattern Used: **Hybrid Referencing with Denormalized Availability Counters & Embedded Bounded Queues**

| Architectural Alternative | Analysis in Library Context | Decision |
| :--- | :--- | :--- |
| **Pure Embedding** (Embedding `loans` inside `books`) | Over time, a popular title can be checked out tens of thousands of times. An unbounded `loans` array causes the document to grow continuously, leading to document fragmentation, frequent re-allocations on disk, and hitting the 16MB BSON limit. | ❌ **Rejected** (Unbounded Array Anti-Pattern) |
| **Pure Normalization** (Relational model: querying active loans to compute availability) | Computing `availableCopies` requires running a `$lookup` join and counting active loans across the `loans` collection every time any user searches or browses catalog titles. Under heavy browsing traffic, this causes severe read bottlenecks. | ❌ **Rejected** (High Query Latency & CPU Overhead) |
| **Hybrid Referenced + Denormalized Strategy** (Chosen) | 1. **Referencing:** `loans` references `books` via `bookId`. Each checkout is an independent document with its own lifecycle.<br>2. **Denormalization:** `availableCopies` is maintained directly on `books` and adjusted atomically with `$inc: { availableCopies: -1 }` on checkout and `+1` on return.<br>3. **Embedded Bounded Queue:** Holds are embedded in `books.holdsQueue` because holds per title are bounded (capped at 20-50), allowing atomic state transitions when a copy is returned. | ✅ **Selected** (Optimal Read/Write Balance & Atomic Consistency) |

---

## 4. MongoDB Schema Validation (`$jsonSchema`)

Schema validation is enforced server-side using MongoDB's `$jsonSchema` engine at `validationLevel: "strict"` and `validationAction: "error"`.

### 4.1 `books` Collection Validator
```javascript
db.createCollection("books", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "isbn",
        "title",
        "author",
        "genres",
        "publicationYear",
        "totalCopies",
        "availableCopies",
        "holdsQueue"
      ],
      properties: {
        isbn: {
          bsonType: "string",
          pattern: "^[0-9-]{10,17}$",
          description: "Must be a valid ISBN format (10-17 chars with hyphens)"
        },
        title: {
          bsonType: "string",
          minLength: 1,
          description: "Book title cannot be empty"
        },
        author: {
          bsonType: "string",
          minLength: 1,
          description: "Author name cannot be empty"
        },
        genres: {
          bsonType: "array",
          minItems: 1,
          items: { bsonType: "string" },
          description: "Array of genre tags, at least one required"
        },
        publicationYear: {
          bsonType: "int",
          minimum: 1450,
          maximum: 2030,
          description: "Valid publication year"
        },
        totalCopies: {
          bsonType: "int",
          minimum: 1,
          description: "Total physical inventory must be at least 1"
        },
        availableCopies: {
          bsonType: "int",
          minimum: 0,
          description: "Available copies cannot be negative"
        },
        holdsQueue: {
          bsonType: "array",
          description: "FIFO queue of holds",
          items: {
            bsonType: "object",
            required: ["patronId", "holdPlacedAt", "status"],
            properties: {
              patronId: { bsonType: "string" },
              holdPlacedAt: { bsonType: "date" },
              status: {
                enum: ["WAITING", "READY_FOR_PICKUP", "EXPIRED"],
                description: "Hold lifecycle status"
              }
            }
          }
        }
      }
    }
  }
});
```

### 4.2 `loans` Collection Validator
```javascript
db.createCollection("loans", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "bookId",
        "patronId",
        "copyBarcode",
        "checkoutDate",
        "dueDate",
        "status",
        "reminders"
      ],
      properties: {
        bookId: {
          bsonType: "objectId",
          description: "Reference to books._id"
        },
        patronId: {
          bsonType: "string",
          description: "Identifier of the borrowing patron"
        },
        copyBarcode: {
          bsonType: "string",
          description: "Physical barcode identifier for the physical book copy"
        },
        checkoutDate: {
          bsonType: "date",
          description: "Date of checkout"
        },
        dueDate: {
          bsonType: "date",
          description: "Loan due date"
        },
        returnDate: {
          bsonType: ["date", "null"],
          description: "Actual return date or null if ongoing"
        },
        status: {
          enum: ["ACTIVE", "RETURNED", "OVERDUE", "LOST"],
          description: "State of the loan"
        },
        reminders: {
          bsonType: "object",
          required: ["count", "lastSentAt"],
          properties: {
            count: {
              bsonType: "int",
              minimum: 0,
              description: "Number of reminder notifications sent"
            },
            lastSentAt: {
              bsonType: ["date", "null"],
              description: "Timestamp of last reminder dispatch"
            }
          }
        }
      }
    }
  }
});
```

---

## 5. Strategic Indexes & Query Optimization

### 5.1 Index 1: Book Availability & Catalog Filter
- **Target Collection:** `books`
- **Index Specification:**
  ```javascript
  db.books.createIndex(
    { "genres": 1, "availableCopies": 1, "title": 1 },
    { name: "idx_books_genre_availability_title" }
  );
  ```
- **Target Query:**
  ```javascript
  db.books.find({
    genres: "Science Fiction",
    availableCopies: { $gt: 0 }
  }).sort({ title: 1 });
  ```
- **Which Query It Improves:**
  This index dramatically accelerates catalog searching and browsing. When a patron searches for available titles in a specific genre (e.g., "Science Fiction") sorted alphabetically:
  1. The **Equality** predicate matches `genres: "Science Fiction"`.
  2. The **Range** filter narrows down records where `availableCopies > 0`.
  3. The index provides sorted keys for `title: 1`, preventing an in-memory blocking sort.
- **Trade-off Analysis:**
  - *Read Benefit:* Query changes from an $O(N)$ full collection scan (`COLLSCAN`) scanning every document in the library catalog to an efficient $O(\log N)$ index scan (`IXSCAN`).
  - *Write Penalty:* Every time a book copy is checked out or returned, `availableCopies` is modified. The database engine must update the index B-tree entry for that book document. In addition, multi-key indexing on the `genres` array creates index entries for each genre, moderately increasing RAM consumption.

---

### 5.2 Index 2: Overdue Reminders & Scheduled Worker Batch Query
- **Target Collection:** `loans`
- **Index Specification:**
  ```javascript
  db.loans.createIndex(
    { "status": 1, "dueDate": 1, "reminders.count": 1 },
    { name: "idx_loans_status_due_reminders" }
  );
  ```
- **Target Query:**
  ```javascript
  db.loans.find({
    status: "OVERDUE",
    dueDate: { $lt: ISODate("2026-11-25T14:15:00.000Z") },
    "reminders.count": { $lt: 3 }
  });
  ```
- **Which Query It Improves:**
  This index is designed specifically for automated background workers (cron tasks / message queues) that dispatch overdue reminder notifications. In a system with hundreds of thousands of historical loans, only a tiny fraction (< 5%) are currently active or overdue.
  - The index directly locates matching candidate loans using `status: "OVERDUE"` (Equality) and `dueDate < now` (Range).
  - The embedded field `reminders.count: { $lt: 3 }` is evaluated within the index key, filtering out patrons who have already received their maximum allotted warnings.
- **Trade-off Analysis:**
  - *Read Benefit:* The automated reminder job avoids scanning hundreds of thousands of completed/returned historical loans (`COLLSCAN`), reducing job runtime from seconds or minutes down to milliseconds (`IXSCAN`).
  - *Write Penalty:* Whenever a reminder is dispatched, `reminders.count` and `reminders.lastSentAt` are updated. Updating an indexed field (`reminders.count`) forces WiredTiger to rewrite the index B-tree node for that loan record. However, since reminder jobs run at low frequencies (e.g., once or twice daily), this trade-off is overwhelmingly favorable for overall cluster health.

---

## 6. Verified Test Execution Output & Screenshot

- **Screenshot Image File:** [mongo_test_screenshot.png](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/mongo_test_screenshot.png)
- **Execution Script:** [mongo_library_system.py](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/mongo_library_system.py)

