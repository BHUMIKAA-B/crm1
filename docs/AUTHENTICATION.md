# Authentication Architecture

The Visit Sarva CRM uses two distinct authentication streams to completely isolate public users from internal employees.

## 1. Public Portal (Buyers/Sellers)
- Users sign up and log in via the public frontend endpoints (`/api/auth`).
- Authenticated via Amazon Cognito. 
- Tokens provided by Cognito are decoded using JWK (JSON Web Keys).
- Standard token `type` is `"access"`.

## 2. Internal CRM (Employees)
- Employees log in through a dedicated route: `/crm/login`.
- Authentication hits `/api/crm/auth/login`.
- JWT Tokens are generated and signed locally by the FastAPI server (using `JWT_SECRET`).
- Token `type` is explicitly set to `"employee_access"`.

## Security Measures
- If a public user token (even if valid) is passed to a `/api/crm/*` endpoint, it will be rejected because the token `type` is not `"employee_access"`.
- This ensures that a compromised public user account cannot access internal business data.
- Employee JWTs contain the `role` attribute directly in the payload, allowing fast initial RBAC enforcement before the database is queried.
