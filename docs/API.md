# API Architecture

The CRM APIs live under the `/api/crm` namespace in the backend to separate them from the public-facing application APIs.

## Routers
- **Auth (`/api/crm/auth`)**: Login, session refresh for employees.
- **Leads (`/api/crm/leads`)**: CRUD operations for leads, assignment updates, status progressions.
- **Properties (`/api/crm/properties`)**: Internal property matching, site visit scheduling.
- **Deals (`/api/crm/deals`)**: Transaction creation, negotiation updates, sanitized financial retrieval.

## Security
- Every CRM endpoint uses `Depends(get_current_employee)` which validates the employee JWT token and ensures the account is `active`.
- If a route alters a record, ownership is verified before the update occurs.
