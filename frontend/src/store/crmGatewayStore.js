import { create } from "zustand";

/**
 * CRM Gateway Store — Layer 1
 *
 * Holds the short-lived gateway JWT returned by POST /api/crm/gate/verify.
 * NOT persisted — state lives in memory only. When the browser tab is closed
 * or the page is refreshed, the user must re-enter the gateway password.
 *
 * Token expiry is also checked against Date.now() so long-running tabs
 * that exceed the 30-minute window are caught automatically.
 */
export const useCrmGatewayStore = create((set, get) => ({
  gatewayToken: null,
  gatewayExpiry: null, // Unix timestamp in ms

  /** Store the gateway token returned by the backend. */
  setGateway: (token, expiresInSeconds) => {
    const expiryMs = Date.now() + expiresInSeconds * 1000;
    set({ gatewayToken: token, gatewayExpiry: expiryMs });
  },

  /** Clear the gateway state (e.g. on session expiry or logout). */
  clearGateway: () => set({ gatewayToken: null, gatewayExpiry: null }),

  /**
   * Returns true if a gateway token exists AND has not expired.
   * Automatically clears expired tokens.
   */
  isGatewayValid: () => {
    const { gatewayToken, gatewayExpiry } = get();
    if (!gatewayToken || !gatewayExpiry) return false;
    if (Date.now() >= gatewayExpiry) {
      // Token has expired — clear it so the user is redirected to the gate
      set({ gatewayToken: null, gatewayExpiry: null });
      return false;
    }
    return true;
  },
}));
