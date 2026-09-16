# Tourist Management System — Requirements

Source of truth together with `SRS.md`. Version 1.0 is limited to these six core features.

## Actors

- **Tourist:** registers, searches, books, pays, downloads tickets, views history, cancels bookings, receives notifications.
- **Admin:** authenticates, manages packages/hotels/prices, oversees bookings, tourists, and payments.
- **System:** sends booking confirmations, payment receipts, and trip reminders.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-01 | Tourists shall register, log in, and search tour packages by destination and date. |
| FR-02 | Tourists shall book a package, complete payment, and download a booking ticket. |
| FR-03 | Tourists shall view booking history and cancel existing bookings. |
| FR-04 | Admins shall add, update, and delete tour packages, hotels, and prices. |
| FR-05 | Admins shall view and manage all bookings, registered tourists, and payment records. |
| FR-06 | The system shall send booking confirmations, payment receipts, and trip reminders. |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | Search results and booking transactions shall complete within 2 seconds under normal conditions. |
| NFR-02 | Stored passwords shall be hashed with SHA-256 or bcrypt for every account. |
| NFR-03 | A tourist shall complete a package booking within 4 clicks from the search page. |
| NFR-04 | Local operation shall remain reliable; notification delivery is recorded in the system log. |

## Out of Scope (do not implement)

Custom itinerary builders, GPS tracking, multi-currency / dynamic pricing, reviews and social sharing, loyalty, referrals, and discount codes.

## Technology Constraints

- Application logic: Python
- Database: SQLite
- Standalone local execution (simulated payment processing; notifications stored and displayed in-app)
