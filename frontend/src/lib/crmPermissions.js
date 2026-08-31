/**
 * Frontend permission helper — mirrors backend RBAC rules.
 * NEVER rely on this alone; the backend always enforces authz too.
 */

export const ROLES = {
  TRAINEE: "trainee",
  EXECUTIVE: "executive",
  TEAM_LEAD: "team_lead",
  BDO: "bdo",
  DPO: "dpo",
  FOUNDER: "founder",
  ADMIN: "admin",
};

const HIERARCHY = [
  ROLES.TRAINEE,
  ROLES.EXECUTIVE,
  ROLES.TEAM_LEAD,
  ROLES.BDO,
  ROLES.DPO,
  ROLES.FOUNDER,
  ROLES.ADMIN,
];

/** Returns true if `role` is at least as senior as `minRole`. */
export function hasRole(role, minRole) {
  return HIERARCHY.indexOf(role) >= HIERARCHY.indexOf(minRole);
}

/** CAN see financial fields (commissions, revenue). */
export function canSeeFinancials(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO].includes(role);
}

/** CAN assign/reassign leads. */
export function canAssignLeads(role) {
  return [ROLES.TEAM_LEAD, ROLES.FOUNDER, ROLES.ADMIN].includes(role);
}

/** CAN create employees. */
export function canManageEmployees(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.TEAM_LEAD].includes(role);
}

/** CAN see customer database & requirements (Founder & BDO only). */
export function canAccessCustomers(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO].includes(role);
}

/** CAN see broker section (Founder & BDO only). */
export function canAccessBrokers(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO].includes(role);
}

/** CAN access owner section (Founder, BDO, Team Lead). */
export function canAccessOwners(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO, ROLES.TEAM_LEAD].includes(role);
}

/** CAN manage or view teams (Founder, BDO, Team Lead). */
export function canAccessTeams(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO, ROLES.TEAM_LEAD].includes(role);
}

/** CAN enroll commissions (Founder, BDO, Team Lead). */
export function canEnrollCommission(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO, ROLES.TEAM_LEAD].includes(role);
}

/** CAN view audit logs (Founder, Admin, BDO, Team Lead, DPO). */
export function canAccessAuditLogs(role) {
  return [ROLES.FOUNDER, ROLES.ADMIN, ROLES.BDO, ROLES.TEAM_LEAD, ROLES.DPO].includes(role);
}

/** Allowed target roles that `userRole` can create in employee management. */
export function allowedCreatableRoles(role) {
  if ([ROLES.FOUNDER, ROLES.ADMIN].includes(role)) {
    return [ROLES.DPO, ROLES.BDO, ROLES.TEAM_LEAD, ROLES.EXECUTIVE, ROLES.TRAINEE];
  }
  if (role === ROLES.BDO) {
    return [ROLES.TEAM_LEAD, ROLES.EXECUTIVE, ROLES.TRAINEE];
  }
  if (role === ROLES.TEAM_LEAD) {
    return [ROLES.EXECUTIVE, ROLES.TRAINEE];
  }
  return [];
}

/** CAN create deals. */
export function canCreateDeals(role) {
  return [ROLES.TEAM_LEAD, ROLES.BDO, ROLES.FOUNDER, ROLES.ADMIN, ROLES.EXECUTIVE].includes(role);
}

/** CAN view all leads (not just own). */
export function canViewAllLeads(role) {
  return [ROLES.TEAM_LEAD, ROLES.BDO, ROLES.DPO, ROLES.FOUNDER, ROLES.ADMIN].includes(role);
}


/** Returns the role display label. */
export function roleLabel(role) {
  const labels = {
    trainee: "Trainee",
    executive: "Executive",
    team_lead: "Team Lead",
    bdo: "BDO",
    dpo: "DPO",
    founder: "Founder",
    admin: "Admin",
  };
  return labels[role] || role;
}

/** Role badge color classes */
export function roleBadgeClass(role) {
  const classes = {
    trainee: "bg-gray-100 text-gray-700",
    executive: "bg-blue-100 text-blue-700",
    team_lead: "bg-purple-100 text-purple-700",
    bdo: "bg-orange-100 text-orange-700",
    dpo: "bg-teal-100 text-teal-700",
    founder: "bg-emerald-100 text-emerald-700",
    admin: "bg-red-100 text-red-700",
  };
  return classes[role] || "bg-gray-100 text-gray-700";
}

/** Lead status color map */
export function statusBadgeClass(status) {
  const map = {
    new: "bg-sky-100 text-sky-700",
    contacted: "bg-yellow-100 text-yellow-700",
    qualified: "bg-violet-100 text-violet-700",
    requirement_captured: "bg-indigo-100 text-indigo-700",
    property_shared: "bg-teal-100 text-teal-700",
    site_visit_planned: "bg-cyan-100 text-cyan-700",
    site_visit_completed: "bg-emerald-100 text-emerald-700",
    negotiation: "bg-orange-100 text-orange-700",
    token: "bg-amber-100 text-amber-700",
    agreement: "bg-lime-100 text-lime-700",
    registration: "bg-green-100 text-green-700",
    closed_won: "bg-green-600 text-white",
    closed_lost: "bg-red-100 text-red-700",
    follow_up_later: "bg-gray-100 text-gray-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

/** Format currency in Indian locale */
export function formatCurrency(value) {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
