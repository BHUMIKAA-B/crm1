# Role-Based Access Control (RBAC) & Scoping Specifications

VisitSarva CRM enforces strict role-based access control (RBAC) and team-based data scoping at the API layer in `backend/services/rbac_service.py`.

## Roles & Organizational Hierarchy

1. **FOUNDER / ADMIN**
   - Organization-wide access to all data (Leads, Customers, Requirements, Teams, Properties, Owners, Brokers, Deals, Office Visits, Commissions, Reports, Audit Logs, Employees).
   - Creation of DPO, BDO, Team Lead, Executive, and Trainee accounts.
   - Account activation and deactivation.
   - Manual entry of Owners and Brokers.

2. **BDO (Business Development Officer)**
   - Access to Customers & Requirements database (restricted exclusively to Founder & BDO).
   - Manual Broker entry and channel partner directory (restricted exclusively to Founder & BDO).
   - Access to Property Owners directory.
   - Team Creation & Employee Management for teams under BDO scope.
   - Full organization-wide lead & deal overview.

3. **TEAM LEADER**
   - Creation & management of Executive and Trainee accounts within their own team.
   - Account activation/deactivation for team members.
   - Manual entry of Property Owners (`source: "manual_crm"`) for their team.
   - Office Visit feedback oversight for team members.
   - Commission enrollment for Executives in their own team.
   - Lead & Deal access scoped to their team member accounts (`get_team_member_ids`).

4. **EXECUTIVE**
   - Handles assigned leads, office visits, negotiations, and deals.
   - Enters feedback for assigned Office Visits (`/api/crm/site-visits/{id}/feedback`).
   - Access restricted to assigned records and own team scope.
   - No access to Customer database, Requirements database, or Broker directory.

5. **TRAINEE**
   - Learner role with access strictly limited to assigned leads, tasks, and properties.
   - No access to financial figures, commission enrollment, customer database, or broker directory.

6. **DPO (Data Protection Officer)**
   - Access to Audit Logs (`/api/crm/audit-logs`), compliance records, and security features.
   - No customer database access or employee account creation permissions.

## Data Scoping Mechanics

- `get_team_member_ids(employee)` computes all employee IDs under a Team Leader or BDO.
- MongoDB queries filter lead, deal, office visit, and owner records using `$in: member_ids` or `$or: [{"assigned_to": {"$in": member_ids}}, ...]`.
- Customer Database & Brokers APIs throw `HTTPException(403)` unless `employee["role"] in ["founder", "admin", "bdo"]`.
