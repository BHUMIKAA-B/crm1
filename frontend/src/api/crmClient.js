import axios from "axios";
import { useCrmAuthStore } from "../store/crmAuthStore";
import { useCrmGatewayStore } from "../store/crmGatewayStore";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const crmApi = axios.create({
  baseURL: `${BACKEND_URL}/api/crm`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach both the employee Bearer token (Layer 2) and the gateway token (Layer 1)
crmApi.interceptors.request.use((config) => {
  // Layer 2 — employee JWT
  const token = useCrmAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Layer 1 — gateway token (informational; primary enforcement is frontend routing)
  const gatewayToken = useCrmGatewayStore.getState().gatewayToken;
  if (gatewayToken) {
    config.headers["X-CRM-Gateway-Token"] = gatewayToken;
  }

  return config;
});

crmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Employee session expired — clear employee auth and return to CRM login
      useCrmAuthStore.getState().logout();
      if (window.location.pathname !== "/crm/login") {
        // Gateway token may still be valid; send to login not gate
        const isGatewayValid = useCrmGatewayStore
          .getState()
          .isGatewayValid();
        if (isGatewayValid) {
          window.location.href = "/crm/login";
        } else {
          window.location.href = "/crm-access";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default crmApi;
