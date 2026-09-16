# Software Requirements Specification — Tourist Management System

**Version:** 1.0  
**Document status:** Source of truth for implementation (with `REQUIREMENTS.md`)

## 1. Purpose and Scope

### Purpose

This SRS defines the functional and non-functional requirements for the Tourist Management System, providing a clear reference for system design, implementation, and verification.

### Scope

The system is a platform designed to manage tour package bookings, payments, and admin management operations.

### In Scope (Version 1.0)

- User registration, authentication, and package search (by destination/date)
- Booking creation, payment processing, and ticket downloading
- Viewing booking history and processing booking cancellations
- Admin package, hotel, and pricing management (CRUD)
- Admin oversight of bookings, tourists, and payment records
- Automated system notifications (booking confirmation, payment receipts, and trip reminders)

### Out of Scope (Version 1.0)

- Custom tour package builders or custom itinerary requests
- Real-time GPS tracking or live tour guide mapping
- Multi-currency conversion or dynamic pricing algorithms
- Third-party user reviews, ratings, or social media sharing
- Loyalty, referral, or discount code programs

## 2. Functional Requirements

- **FR-01:** The system shall allow tourists to register, log in, and search tour packages by destination and date.
- **FR-02:** The system shall enable tourists to book a package, make payments, and download tickets.
- **FR-03:** The system shall allow tourists to view their booking history and cancel existing bookings.
- **FR-04:** The system shall provide admins the ability to add, update, and delete tour packages, hotels, and prices.
- **FR-05:** The system shall allow admins to view and manage all bookings, registered tourists, and payment records.
- **FR-06:** The system shall send booking confirmations, payment receipts, and trip reminders to tourists.

## 3. Non-Functional Requirements

- **NFR-01 (Speed):** The system shall load search results and complete booking transactions within 2 seconds under normal operating conditions.
- **NFR-02 (Security):** The system shall encrypt stored tourist passwords using SHA-256 or bcrypt, ensuring 100% compliance across all user accounts.
- **NFR-03 (Usability):** The user interface shall allow a tourist to complete a package booking within 4 clicks from the search page.
- **NFR-04 (Reliability):** The system shall maintain 99.5% uptime during operational hours and generate automated notifications with a recorded delivery log.

## 4. Assumptions and Constraints

### Assumptions

- Users and administrators can run the application locally and complete payments through the in-app payment flow.
- Payment handling is simulated in Version 1.0 (no unlisted enterprise payment gateway).
- Notifications are generated automatically and stored for the tourist (and optionally emailed if SMTP is configured).

### Constraints

- Technology stack is limited to Python for application logic and SQLite for relational storage.
- The project must function without unlisted external enterprise services.
- System capabilities are strictly limited to the six core requirements in this specification.

## 5. User Stories (traceability)

- **US-01:** As a tourist, I want to register, log in, and search for tour packages by destination and date.
- **US-02:** As a tourist, I want to book a tour package, complete payment, and download my booking ticket.
- **US-03:** As a tourist, I want to view my booking history and cancel existing bookings.
- **US-04:** As an admin, I want to add, update, and delete tour packages, hotels, and pricing information.
- **US-05:** As an admin, I want to view and manage all system bookings, registered tourists, and payment records.
- **US-06:** As a tourist, I want to receive automated booking confirmations, payment receipts, and trip reminders.
