# Tourist Management System

A local platform designed to manage tour package bookings, payments, and admin operations.

## Features (Version 1.0)
- User registration, authentication, and package search (by destination/date)
- Booking creation, simulated payment processing, and ticket downloading
- Viewing booking history and processing booking cancellations
- Admin package, hotel, and pricing management (CRUD)
- Admin oversight of bookings, tourists, and payment records
- Automated system notifications (booking confirmation, payment receipts, and trip reminders)

## Setup and Run Instructions

### Prerequisites
- Python 3.10+
- `pip` or `uv` package manager

### 1. Install Dependencies
Create a virtual environment (optional but recommended) and install the dependencies from `requirements.txt`:
```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Run the Application
Start the FastAPI server using `uvicorn`:
```bash
uvicorn app.main:app --reload
```
The server will start on `http://127.0.0.1:8000`.

### 3. Access the Application
Open your web browser and navigate to:
[http://127.0.0.1:8000](http://127.0.0.1:8000)

### 4. Default Admin Credentials
The system automatically seeds an admin user if the database is empty:
- **Email:** `admin@tourmanager.com`
- **Password:** `admin123`

## Testing
To run the automated tests using `pytest`:
```bash
pytest tests/
```

## Validation Update
- Frontend validation has been improved with HTML5 constraints (`required`, `minlength`, `type="email"`, `type="number"`, `step`).
- Backend validation is strictly enforced using Pydantic schemas in `app/schemas.py`, ensuring data integrity before any database operation.
