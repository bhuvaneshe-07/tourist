Role Mapping

User 1 (Librarian / Admin):

Manage book inventory (Add, update, remove records)

Issue books to User 2 and record returned items

Calculate and collect fine payments for overdue books

Search book catalog (by title, author, category)

Authenticate securely

User 2 (Member / Borrower):

Search book catalog (by title, author, category)

Access Account Dashboard (View borrowed books, due dates, borrowing history)

Authenticate securely
********************************************************************************************************************************************
To write the Purpose and Scope section accurately, please share your specific requirements file (requirements.md) or list the 6 core features of your Student Management System.

Once provided, I will generate a concise, compliant SRS section staying under 200 words.
********************************************************************************************************************************************
Please share the six core features or the contents of your requirements file (requirements.md).

Once you provide those six features, I will immediately write the Functional Requirements section formatted as FR-01 through FR-06, each starting with "The system shall" and restricted strictly to your list.
********************************************************************************************************************************************
Non-Functional Requirements

NFR-01 (Speed): The system shall process database queries and return search, retrieval, or save operations within 2 seconds under normal operating conditions.

NFR-02 (Security): The system shall hash stored user passwords using SHA-256 or bcrypt encryption with 100% compliance across all accounts.

NFR-03 (Usability): The application interface shall allow a new user to navigate to and execute any core feature within 3 clicks or keypresses without training.

NFR-04 (Reliability): The system shall maintain an uptime of 99.5% during local execution and operate with zero unhandled exceptions during standard data entry.
********************************************************************************************************************************************
Single-User Access: The application will run as a local desktop program intended for a single administrator operating one session at a time.

Environment Setup: Python 3.x and standard execution libraries are pre-installed on the target operating system.

Persistent Local Storage: The local file system provides continuous read and write permissions for SQLite database storage without network-dependent security blocks.

Constraints

Technology Stack: Development is strictly limited to Python for application logic and standard SQLite for relational data storage.

Local Execution: The project must run entirely offline as a local application without external server hosting or remote API dependencies.

Development Scope: Architectural complexity is restricted to essential relational tables and local file management suitable for completion within a few weeks.
