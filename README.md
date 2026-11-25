# Library Lending System: MongoDB Schema & Index Implementation

This repository contains the complete MongoDB schema, validation rules, indexing strategy, and execution plan benchmarks for a **Library Lending System** focusing on:
1. **Book Availability**
2. **Hold Reservation Queues**
3. **Overdue Reminders**

## Project Files
- [mongo_library_system.py](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/mongo_library_system.py): Complete implementation script (creates collections with `$jsonSchema`, sets up indexes, runs positive/negative validation tests, seeds test dataset, runs `explain()` query plans, and performs domain operations).
- [DOCUMENTATION.md](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/DOCUMENTATION.md): Complete technical design document detailing schema definitions, relationship trade-offs, ESR indexing rules, and performance comparisons.
- [mongo_test_screenshot.png](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/mongo_test_screenshot.png): High-resolution terminal execution screenshot showing schema validation passes/fails, index explain metrics, and domain operations.

## Quick Start
Run the test script directly against any running MongoDB instance (`localhost:27017`):
```bash
python mongo_library_system.py
```
