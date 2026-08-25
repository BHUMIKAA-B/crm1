# Role-Based Access Control (RBAC)

The CRM uses a robust RBAC mechanism enforced at the API layer.

## Roles
1. **TRAINEE**: Lowest access. Can only see their own assigned leads, properties, and tasks. No financial visibility.
2. **EXECUTIVE**: Core salesperson. Owns leads and handles them through to deals. Can only see their own commissions.
3. **TEAM LEAD**: Manages a team of executives/trainees. Can reassign leads among their team. Sees their team's data.
4. **BDO (Business Development Officer)**: Focuses on acquisitions, brokers, owners, and large partnerships.
5. **FOUNDER / ADMIN**: Unrestricted global access. Has complete view of all leads, financial records, total revenue, and can manage employees.

## Implementation
RBAC is implemented in `backend/services/rbac_service.py` via FastAPI dependency injection:
- `get_current_employee` decodes the internal JWT.
- `require_employee_roles` restricts endpoints to specific roles.

Data sanitization occurs on the model serialization step (e.g. `sanitize_deal_for_employee`) where sensitive fields like `actual_commission` are stripped from the response for unauthorized users.
