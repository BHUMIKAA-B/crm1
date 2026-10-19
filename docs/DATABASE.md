# Database Architecture

The CRM extends the existing MongoDB database with several specialized collections for the internal business logic.

## Collections
- `employees`: Stores internal staff accounts, roles, hashed passwords, and reporting chains.
- `leads`: Core sales inquiries tracking sources, assigned personnel, and statuses.
- `customers`: Persistent profiles linked across leads, requirements, and deals.
- `requirements`: Specific real estate requirements attached to a customer.
- `properties`: The inventory base, which is matched to requirements.
- `owners` / `brokers`: Third-party business relationships.
- `site_visits`: Scheduled viewings with feedback capture.
- `deals`: Financial transaction records.
- `negotiations`: Tracks offers and counter-offers.
- `audit_logs`: Immutable tracking of every significant business action.
- `timeline_events`: Human-readable timeline steps associated with a Lead or Customer.

## Soft Deletion
Records are never "hard deleted." They are moved to terminal states like `closed_lost`, `exited` (for employees), or `archived`.
