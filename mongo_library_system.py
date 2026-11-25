"""
MongoDB Schema, Validation, Indexes & Execution Plan Analysis
Domain: Library Lending System (Book Availability, Holds, and Overdue Reminders)
"""

import os
import sys
import json
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient, errors
from bson import ObjectId

# Load .env if present
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://jainpalchhi2k6_db_user:TeCS9Z2UAj3GKlQg@cluster0.kwbl0mw.mongodb.net/?retryWrites=true&w=majority"
)
DB_NAME = os.getenv("DB_NAME", "library_lending_db")

def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    return client[DB_NAME], client

BOOKS_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "isbn",
            "title",
            "author",
            "genres",
            "publicationYear",
            "totalCopies",
            "availableCopies",
            "holdsQueue"
        ],
        "properties": {
            "isbn": {
                "bsonType": "string",
                "pattern": "^[0-9-]{10,17}$",
                "description": "Unique ISBN-10 or ISBN-13 format (10-17 chars with hyphens)"
            },
            "title": {
                "bsonType": "string",
                "minLength": 1,
                "description": "Book title is required and cannot be empty"
            },
            "author": {
                "bsonType": "string",
                "minLength": 1,
                "description": "Author name is required"
            },
            "genres": {
                "bsonType": "array",
                "minItems": 1,
                "items": { "bsonType": "string" },
                "description": "List of genres associated with the book"
            },
            "publicationYear": {
                "bsonType": "int",
                "minimum": 1450,
                "maximum": 2030,
                "description": "Valid publication year"
            },
            "totalCopies": {
                "bsonType": "int",
                "minimum": 1,
                "description": "Total physical copies owned by the library (must be >= 1)"
            },
            "availableCopies": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Copies currently on shelf available for borrowing (cannot be negative)"
            },
            "holdsQueue": {
                "bsonType": "array",
                "description": "Bounded FIFO queue of patrons waiting for this title when availableCopies == 0",
                "items": {
                    "bsonType": "object",
                    "required": ["patronId", "holdPlacedAt", "status"],
                    "properties": {
                        "patronId": {
                            "bsonType": "string",
                            "description": "Patron identifier placing the hold"
                        },
                        "holdPlacedAt": {
                            "bsonType": "date",
                            "description": "Timestamp when hold was requested"
                        },
                        "status": {
                            "enum": ["WAITING", "READY_FOR_PICKUP", "EXPIRED"],
                            "description": "Current lifecycle status of the hold"
                        }
                    }
                }
            }
        }
    }
}

# Entity 2: loans
# Represents physical borrowing transactions, checkout lifecycle, and overdue reminder records.
LOANS_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "bookId",
            "patronId",
            "copyBarcode",
            "checkoutDate",
            "dueDate",
            "status",
            "reminders"
        ],
        "properties": {
            "bookId": {
                "bsonType": "objectId",
                "description": "Foreign key reference to books._id"
            },
            "patronId": {
                "bsonType": "string",
                "description": "Unique identifier of the borrowing patron"
            },
            "copyBarcode": {
                "bsonType": "string",
                "description": "Physical barcode scanner ID for the specific copy"
            },
            "checkoutDate": {
                "bsonType": "date",
                "description": "Date and time the book was checked out"
            },
            "dueDate": {
                "bsonType": "date",
                "description": "Return deadline date"
            },
            "returnDate": {
                "bsonType": ["date", "null"],
                "description": "Actual date returned, null while loan is active or overdue"
            },
            "status": {
                "enum": ["ACTIVE", "RETURNED", "OVERDUE", "LOST"],
                "description": "Lifecycle state of the loan"
            },
            "reminders": {
                "bsonType": "object",
                "required": ["count", "lastSentAt"],
                "properties": {
                    "count": {
                        "bsonType": "int",
                        "minimum": 0,
                        "description": "Number of overdue reminders dispatched"
                    },
                    "lastSentAt": {
                        "bsonType": ["date", "null"],
                        "description": "Timestamp of most recent reminder sent"
                    }
                }
            }
        }
    }
}


def setup_collections(db):
    """Initializes collections with strict JSON schema validators and indexes."""
    print("=" * 70)
    print("STEP 1: CREATING COLLECTIONS WITH STRICT $jsonSchema VALIDATION")
    print("=" * 70)

    # Clean existing collections
    existing = db.list_collection_names()
    if "books" in existing:
        db.books.drop()
    if "loans" in existing:
        db.loans.drop()

    # Create books collection with validator
    db.create_collection(
        "books",
        validator=BOOKS_SCHEMA,
        validationLevel="strict",
        validationAction="error"
    )
    print("✓ Collection 'books' created with schema validator.")

    # Create loans collection with validator
    db.create_collection(
        "loans",
        validator=LOANS_SCHEMA,
        validationLevel="strict",
        validationAction="error"
    )
    print("✓ Collection 'loans' created with schema validator.")

    print("\n" + "=" * 70)
    print("STEP 2: CREATING STRATEGIC INDEXES")
    print("=" * 70)

    # 1. Unique ISBN index
    db.books.create_index([("isbn", 1)], unique=True, name="idx_books_isbn_unique")
    print("✓ Created unique index on books.isbn")

    # 2. Targeted Index 1: Book Availability & Catalog Filter
    # Supports queries filtering by genre and looking for available books sorted by title
    # Query: db.books.find({ genres: "Science Fiction", availableCopies: { $gt: 0 } }).sort({ title: 1 })
    db.books.create_index(
        [("genres", 1), ("availableCopies", 1), ("title", 1)],
        name="idx_books_genre_availability_title"
    )
    print("✓ Created Index 1: idx_books_genre_availability_title on books (genres: 1, availableCopies: 1, title: 1)")

    # 3. Targeted Index 2: Overdue Reminders Batch Processing
    # Supports automated worker queries searching for active loans past due date needing reminder notification
    # Query: db.loans.find({ status: "ACTIVE", dueDate: { $lt: ISODate(...) }, "reminders.count": { $lt: 3 } })
    db.loans.create_index(
        [("status", 1), ("dueDate", 1), ("reminders.count", 1)],
        name="idx_loans_status_due_reminders"
    )
    print("✓ Created Index 2: idx_loans_status_due_reminders on loans (status: 1, dueDate: 1, reminders.count: 1)")

    # 4. Foreign key lookup index on loans
    db.loans.create_index([("bookId", 1), ("status", 1)], name="idx_loans_book_status")
    print("✓ Created supporting index: idx_loans_book_status on loans (bookId: 1, status: 1)")


def run_validation_tests(db):
    """Executes positive and negative validation tests against MongoDB schema."""
    print("\n" + "=" * 70)
    print("STEP 3: TESTING SCHEMA VALIDATION ENFORCEMENT")
    print("=" * 70)

    # Positive Test: Insert valid book
    valid_book = {
        "isbn": "978-0141439518",
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "genres": ["Classic", "Romance", "Literature"],
        "publicationYear": 1813,
        "totalCopies": 5,
        "availableCopies": 4,
        "holdsQueue": []
    }
    book_id = db.books.insert_one(valid_book).inserted_id
    print(f"✓ [PASS] Valid Book Inserted Successfully! _id: {book_id}")

    # Positive Test: Insert valid loan
    now = datetime.now(timezone.utc)
    valid_loan = {
        "bookId": book_id,
        "patronId": "patron_USR_1001",
        "copyBarcode": "BARCODE-P&P-01",
        "checkoutDate": now - timedelta(days=7),
        "dueDate": now + timedelta(days=14),
        "returnDate": None,
        "status": "ACTIVE",
        "reminders": {
            "count": 0,
            "lastSentAt": None
        }
    }
    loan_id = db.loans.insert_one(valid_loan).inserted_id
    print(f"✓ [PASS] Valid Loan Inserted Successfully! _id: {loan_id}")

    # Negative Test 1: Invalid availableCopies (negative number)
    print("\nTesting Negative Test 1: Insert book with availableCopies = -1 (Violation)")
    invalid_book_neg_copies = {
        "isbn": "978-0061120084",
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "genres": ["Classic", "Fiction"],
        "publicationYear": 1960,
        "totalCopies": 3,
        "availableCopies": -1,  # VIOLATION: minimum is 0
        "holdsQueue": []
    }
    try:
        db.books.insert_one(invalid_book_neg_copies)
        print("✗ [FAIL] Negative test failed: Invalid book was inserted!")
    except errors.WriteError as e:
        print(f"✓ [PASS] Schema validation caught violation as expected: {e.details.get('errmsg', str(e))}")

    # Negative Test 2: Invalid status in loan (enum violation)
    print("\nTesting Negative Test 2: Insert loan with invalid status 'IN_TRANSIT' (Violation)")
    invalid_loan_enum = {
        "bookId": book_id,
        "patronId": "patron_USR_1002",
        "copyBarcode": "BARCODE-P&P-02",
        "checkoutDate": now,
        "dueDate": now + timedelta(days=21),
        "returnDate": None,
        "status": "IN_TRANSIT",  # VIOLATION: not in enum ['ACTIVE', 'RETURNED', 'OVERDUE', 'LOST']
        "reminders": {
            "count": 0,
            "lastSentAt": None
        }
    }
    try:
        db.loans.insert_one(invalid_loan_enum)
        print("✗ [FAIL] Negative test failed: Invalid loan status was inserted!")
    except errors.WriteError as e:
        print(f"✓ [PASS] Schema validation caught enum violation as expected: {e.details.get('errmsg', str(e))}")

    # Negative Test 3: Missing required field 'dueDate' in loan
    print("\nTesting Negative Test 3: Insert loan missing required field 'dueDate' (Violation)")
    invalid_loan_missing_field = {
        "bookId": book_id,
        "patronId": "patron_USR_1003",
        "copyBarcode": "BARCODE-P&P-03",
        "checkoutDate": now,
        # 'dueDate' omitted
        "returnDate": None,
        "status": "ACTIVE",
        "reminders": {
            "count": 0,
            "lastSentAt": None
        }
    }
    try:
        db.loans.insert_one(invalid_loan_missing_field)
        print("✗ [FAIL] Negative test failed: Loan missing required field was inserted!")
    except errors.WriteError as e:
        print(f"✓ [PASS] Schema validation caught missing required property: {e.details.get('errmsg', str(e))}")


def seed_dataset(db, num_books=2000, num_loans=10000):
    """Seeds a realistic dataset for query plan and benchmark evaluation."""
    print("\n" + "=" * 70)
    print(f"STEP 4: SEEDING DATASET ({num_books} books, {num_loans} loans)")
    print("=" * 70)

    import random

    genres_list = ["Science Fiction", "Mystery", "History", "Technology", "Classic", "Philosophy", "Biography"]
    book_docs = []
    now = datetime.now(timezone.utc)

    for i in range(1, num_books + 1):
        total = random.randint(1, 10)
        avail = random.randint(0, total)
        holds = []
        if avail == 0 and random.random() < 0.6:
            # Add 1 to 3 holds in the embedded queue
            for h in range(random.randint(1, 3)):
                holds.append({
                    "patronId": f"patron_queue_{random.randint(100, 999)}",
                    "holdPlacedAt": now - timedelta(days=random.randint(1, 10)),
                    "status": "WAITING"
                })

        selected_genres = random.sample(genres_list, k=random.randint(1, 2))
        book_docs.append({
            "isbn": f"978-{random.randint(100, 999)}-{random.randint(1000, 9999)}-{i % 10}",
            "title": f"Book Title Volume {i}",
            "author": f"Author Name {i % 100}",
            "genres": selected_genres,
            "publicationYear": random.randint(1950, 2024),
            "totalCopies": total,
            "availableCopies": avail,
            "holdsQueue": holds
        })

    result_books = db.books.insert_many(book_docs)
    inserted_book_ids = result_books.inserted_ids
    print(f"✓ Seeded {len(inserted_book_ids)} books.")

    loan_docs = []
    for j in range(1, num_loans + 1):
        b_id = random.choice(inserted_book_ids)
        # Determine status: 60% RETURNED, 25% ACTIVE (some overdue), 15% OVERDUE
        rand_val = random.random()
        if rand_val < 0.60:
            status = "RETURNED"
            checkout_days_ago = random.randint(20, 100)
            c_date = now - timedelta(days=checkout_days_ago)
            d_date = c_date + timedelta(days=14)
            r_date = c_date + timedelta(days=random.randint(5, 13))
            rem_count = 0
            last_rem = None
        elif rand_val < 0.85:
            status = "ACTIVE"
            checkout_days_ago = random.randint(1, 10)
            c_date = now - timedelta(days=checkout_days_ago)
            d_date = c_date + timedelta(days=14) # still in future
            r_date = None
            rem_count = 0
            last_rem = None
        else:
            status = "OVERDUE"
            checkout_days_ago = random.randint(20, 45)
            c_date = now - timedelta(days=checkout_days_ago)
            d_date = c_date + timedelta(days=14) # already in past!
            r_date = None
            rem_count = random.randint(0, 2)
            last_rem = now - timedelta(days=random.randint(1, 5)) if rem_count > 0 else None

        loan_docs.append({
            "bookId": b_id,
            "patronId": f"patron_{random.randint(1000, 9999)}",
            "copyBarcode": f"BC-{b_id}-{j}",
            "checkoutDate": c_date,
            "dueDate": d_date,
            "returnDate": r_date,
            "status": status,
            "reminders": {
                "count": rem_count,
                "lastSentAt": last_rem
            }
        })

    db.loans.insert_many(loan_docs)
    print(f"✓ Seeded {num_loans} loan transactions.")


def test_query_execution_plans(db):
    """Executes explain plans on the target queries with and without indexes."""
    print("\n" + "=" * 70)
    print("STEP 5: QUERY PERFORMANCE & EXECUTION PLAN ANALYSIS (EXPLAIN)")
    print("=" * 70)

    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------
    # QUERY 1: Book Availability Check & Catalog Browsing
    # "Find available Science Fiction books with copies available on shelf, sorted by title"
    # -------------------------------------------------------------
    print("\n[QUERY 1] Book Availability Search: { genres: 'Science Fiction', availableCopies: { $gt: 0 } }")
    query_1_filter = {"genres": "Science Fiction", "availableCopies": {"$gt": 0}}
    sort_1 = [("title", 1)]

    # 1. With Index (idx_books_genre_availability_title)
    explain_indexed_q1 = db.books.find(query_1_filter).sort(sort_1).explain()["executionStats"]
    
    # 2. Without Index (forcing COLLSCAN via natural order)
    explain_unindexed_q1 = db.books.find(query_1_filter).sort(sort_1).hint([("$natural", 1)]).explain()["executionStats"]

    print("-" * 55)
    print(f"Query 1: WITH INDEX ({'idx_books_genre_availability_title'})")
    print(f"  • Execution Stage:       {explain_indexed_q1['executionStages'].get('stage', 'N/A')}")
    print(f"  • Total Docs Examined:   {explain_indexed_q1['totalDocsExamined']}")
    print(f"  • Total Keys Examined:   {explain_indexed_q1['totalKeysExamined']}")
    print(f"  • Matching Docs Returned:{explain_indexed_q1['nReturned']}")
    print(f"  • Execution Time:        {explain_indexed_q1['executionTimeMillis']} ms")

    print("-" * 55)
    print("Query 1: WITHOUT INDEX (COLLSCAN)")
    print(f"  • Execution Stage:       {explain_unindexed_q1['executionStages'].get('stage', 'N/A')}")
    print(f"  • Total Docs Examined:   {explain_unindexed_q1['totalDocsExamined']}")
    print(f"  • Total Keys Examined:   {explain_unindexed_q1['totalKeysExamined']}")
    print(f"  • Matching Docs Returned:{explain_unindexed_q1['nReturned']}")
    print(f"  • Execution Time:        {explain_unindexed_q1['executionTimeMillis']} ms")

    # -------------------------------------------------------------
    # QUERY 2: Overdue Reminders Worker Batch Query
    # "Find all active/overdue loans where dueDate < now and reminder count < 3"
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[QUERY 2] Overdue Reminder Batch Query: { status: 'OVERDUE', dueDate: { $lt: now }, 'reminders.count': { $lt: 3 } }")
    query_2_filter = {
        "status": "OVERDUE",
        "dueDate": {"$lt": now},
        "reminders.count": {"$lt": 3}
    }

    # 1. With Index (idx_loans_status_due_reminders)
    explain_indexed_q2 = db.loans.find(query_2_filter).explain()["executionStats"]

    # 2. Without Index (forcing COLLSCAN)
    explain_unindexed_q2 = db.loans.find(query_2_filter).hint([("$natural", 1)]).explain()["executionStats"]

    print("-" * 55)
    print(f"Query 2: WITH INDEX ({'idx_loans_status_due_reminders'})")
    print(f"  • Execution Stage:       {explain_indexed_q2['executionStages'].get('stage', 'N/A')}")
    print(f"  • Total Docs Examined:   {explain_indexed_q2['totalDocsExamined']}")
    print(f"  • Total Keys Examined:   {explain_indexed_q2['totalKeysExamined']}")
    print(f"  • Matching Docs Returned:{explain_indexed_q2['nReturned']}")
    print(f"  • Execution Time:        {explain_indexed_q2['executionTimeMillis']} ms")

    print("-" * 55)
    print("Query 2: WITHOUT INDEX (COLLSCAN)")
    print(f"  • Execution Stage:       {explain_unindexed_q2['executionStages'].get('stage', 'N/A')}")
    print(f"  • Total Docs Examined:   {explain_unindexed_q2['totalDocsExamined']}")
    print(f"  • Total Keys Examined:   {explain_unindexed_q2['totalKeysExamined']}")
    print(f"  • Matching Docs Returned:{explain_unindexed_q2['nReturned']}")
    print(f"  • Execution Time:        {explain_unindexed_q2['executionTimeMillis']} ms")

    return {
        "q1_indexed": explain_indexed_q1,
        "q1_unindexed": explain_unindexed_q1,
        "q2_indexed": explain_indexed_q2,
        "q2_unindexed": explain_unindexed_q2
    }


def demonstrate_business_operations(db):
    """Demonstrates live business logic for Book Availability, Holds, and Overdue Reminders."""
    print("\n" + "=" * 70)
    print("STEP 6: DEMONSTRATING DOMAIN OPERATIONS (Availability, Holds, Reminders)")
    print("=" * 70)

    now = datetime.now(timezone.utc)

    # 1. Place a hold when availableCopies == 0
    print("\n[Operation 1] Patron places a hold on an unavailable book")
    target_book = db.books.find_one({"availableCopies": 0})
    if target_book:
        patron_hold = {
            "patronId": "patron_RESERVE_99",
            "holdPlacedAt": now,
            "status": "WAITING"
        }
        db.books.update_one(
            {"_id": target_book["_id"]},
            {"$push": {"holdsQueue": patron_hold}}
        )
        updated_book = db.books.find_one({"_id": target_book["_id"]})
        print(f"✓ Hold added to queue for '{updated_book['title']}'. Current queue length: {len(updated_book['holdsQueue'])}")

    # 2. Checkout an available book: decrement availableCopies atomically and create loan
    print("\n[Operation 2] Patron checks out an available book")
    avail_book = db.books.find_one({"availableCopies": {"$gt": 0}})
    if avail_book:
        # Atomic decrement
        res = db.books.update_one(
            {"_id": avail_book["_id"], "availableCopies": {"$gt": 0}},
            {"$inc": {"availableCopies": -1}}
        )
        if res.modified_count == 1:
            new_loan = {
                "bookId": avail_book["_id"],
                "patronId": "patron_CHECKOUT_42",
                "copyBarcode": f"BC-{avail_book['_id']}-NEW",
                "checkoutDate": now,
                "dueDate": now + timedelta(days=14),
                "returnDate": None,
                "status": "ACTIVE",
                "reminders": {"count": 0, "lastSentAt": None}
            }
            inserted_loan = db.loans.insert_one(new_loan)
            print(f"✓ Book '{avail_book['title']}' checked out! Loan ID: {inserted_loan.inserted_id}")
            print(f"  Available copies updated: {avail_book['availableCopies']} -> {avail_book['availableCopies'] - 1}")

    # 3. Overdue Reminder Dispatcher: find overdue loan and increment reminder count
    print("\n[Operation 3] Automated worker dispatches overdue reminder")
    overdue_loan = db.loans.find_one({
        "status": "OVERDUE",
        "dueDate": {"$lt": now},
        "reminders.count": {"$lt": 3}
    })
    if overdue_loan:
        db.loans.update_one(
            {"_id": overdue_loan["_id"]},
            {
                "$inc": {"reminders.count": 1},
                "$set": {"reminders.lastSentAt": now}
            }
        )
        updated_loan = db.loans.find_one({"_id": overdue_loan["_id"]})
        print(f"✓ Overdue reminder sent to {updated_loan['patronId']} for loan {updated_loan['_id']}.")
        print(f"  Reminder count incremented to {updated_loan['reminders']['count']} at {updated_loan['reminders']['lastSentAt']}.")


if __name__ == "__main__":
    try:
        db, client = get_db()
        setup_collections(db)
        run_validation_tests(db)
        seed_dataset(db, num_books=1500, num_loans=5000)
        stats = test_query_execution_plans(db)
        demonstrate_business_operations(db)
        print("\n" + "=" * 70)
        print("ALL DEMONSTRATIONS, VALIDATIONS, AND BENCHMARKS COMPLETED!")
        print("=" * 70)
    except errors.ServerSelectionTimeoutError:
        print("ERROR: Could not connect to MongoDB on localhost:27017. Ensure container/service is running.")
        sys.exit(1)
