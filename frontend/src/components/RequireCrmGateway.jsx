import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCrmGatewayStore } from "@/store/crmGatewayStore";

/**
 * RequireCrmGateway
 *
 * Protects all /crm/* routes from direct URL access.
 * If the user has not passed the Layer-1 CRM gateway password check,
 * they are redirected to /crm-access regardless of their employee session.
 *
 * Flow:
 *   Direct /crm/dashboard (no gateway token)
 *     → /crm-access?next=/crm/dashboard
 *     → (user enters correct password)
 *     → /crm/login (Layer 2 employee authentication)
 *     → /crm/dashboard
 */
const RequireCrmGateway = ({ children }) => {
  const isGatewayValid = useCrmGatewayStore((s) => s.isGatewayValid);
  const location = useLocation();

  if (!isGatewayValid()) {
    // Preserve the intended destination so the user ends up in the right place
    // after entering the gateway password.
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate to={`/crm-access?next=${next}`} replace />
    );
  }

  return children;
};

export default RequireCrmGateway;
