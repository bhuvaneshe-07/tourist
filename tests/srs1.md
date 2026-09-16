1. Purpose and Scope
Purpose
This SRS defines the functional and non-functional requirements for the Tourist Management System, providing a clear reference for system design, implementation, and verification.
Scope
The system is a platform designed to manage tour package bookings, payments, and admin management operations.
IN Scope (Version 1.0)
User registration, authentication, and package search (by destination/date).
Booking creation, payment processing, and ticket downloading.
Viewing booking history and processing booking cancellations.
Admin package, hotel, and pricing management (CRUD operations).
Admin oversight of bookings, tourists, and payment records.
Automated system notifications (booking confirmation, payment receipts, and trip reminders).
OUT of Scope (Version 1.0)
Custom tour package builders or custom itinerary requests.
Real-time GPS tracking or live tour guide mapping.
Multi-currency conversion or dynamic pricing algorithms.
Third-party user reviews, ratings, or social media sharing.
Loyalty, referral, or discount code programs.
2. Functional Requirements
FR-01: The system shall allow tourists to register, log in, and search tour packages by destination and date.
FR-02: The system shall enable tourists to book a package, make payments, and download tickets.
FR-03: The system shall allow tourists to view their booking history and cancel existing bookings.
FR-04: The system shall provide admins the ability to add, update, and delete tour packages, hotels, and prices.
FR-05: The system shall allow admins to view and manage all bookings, registered tourists, and payment records.
FR-06: The system shall send booking confirmations, payment receipts, and trip reminders to tourists.
3. Non-Functional Requirements
NFR-01 (Speed): The system shall load search results and complete booking transactions within 2 seconds under normal operating conditions.
NFR-02 (Security): The system shall encrypt stored tourist passwords using SHA-256 or bcrypt, ensuring 100% compliance across all user accounts.
NFR-03 (Usability): The user interface shall allow a tourist to complete a package booking within 4 clicks from the search page.
NFR-04 (Reliability): The system shall maintain 99.5% uptime during operational hours and generate automated email notifications with a delivery success rate of at least 98%.
4. Assumptions and Constraints
Assumptions
Network Connectivity: Users and administrators have active internet connections to execute payments and receive real-time notifications.
Third-Party Payment Handling: A reliable payment gateway API is accessible to process transactions securely.
Email Service: An SMTP server or messaging service is available to deliver receipts and reminders without external deliverability blocks.
Constraints
Technology Stack: Implementation is strictly limited to Python for application logic and SQLite for relational database management.
Standalone Execution: The project must function without dependencies on unlisted external enterprise services or non-standard third-party frameworks.
Strict Feature Boundary: System capabilities are strictly limited to the six core requirements listed in this specification.
**********************************************************************
1. Purpose and Scope
Purpose
This section defines the purpose and functional boundaries of the Tourist Management System SRS, establishing a clear baseline for design, implementation, and testing.
Scope
The application is a centralized system for managing tour bookings, payments, and system administration.
IN Scope (Version 1.0)
User registration, authentication, and destination/date search functionality.
Package booking, payment handling, and ticket downloads.
Booking history views and booking cancellations.
Administrative CRUD management for packages, hotels, and pricing.
Administrative oversight of bookings, tourist records, and payments.
Automated notifications for confirmations, payment receipts, and trip reminders.
OUT of Scope (Version 1.0)
Custom itinerary or tour building options.
Real-time GPS tracking or live navigation during trips.
Multi-currency processing or dynamic price adjustment algorithms.
Third-party review mechanisms, rating systems, or social media integration.
Discount codes, loyalty rewards, or referral programs. 
**********************************************************************
Functional Requirements
FR-01: The system shall allow tourists to register, log in, and search for tour packages by destination and date.
FR-02: The system shall enable tourists to book tour packages, complete payments, and download booking tickets.
FR-03: The system shall allow tourists to view their booking history and cancel existing bookings.
FR-04: The system shall provide admins with functionality to add, update, and delete tour packages, hotels, and pricing information.
FR-05: The system shall enable admins to view and manage all system bookings, registered tourists, and payment records.
FR-06: The system shall automatically send booking confirmations, payment receipts, and trip reminders to tourists.
**********************************************************************
Non-Functional Requirements
NFR-01 (Speed): The system shall load search results, process payments, and render booking tickets within 2 seconds under normal operating conditions.
NFR-02 (Security): The system shall encrypt stored tourist and admin passwords using SHA-256 or bcrypt, maintaining 100% compliance across all registered user accounts.
NFR-03 (Usability): The interface shall allow a tourist to search for a package and complete a booking within 4 clicks from the homepage.
NFR-04 (Reliability): The system shall maintain an uptime of 99.5% and achieve a delivery success rate of at least 98% for booking confirmations, payment receipts, and trip reminders.