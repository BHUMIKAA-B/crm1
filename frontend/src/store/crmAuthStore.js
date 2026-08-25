import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCrmAuthStore = create(
  persist(
    (set, get) => ({
      employee: null,
      accessToken: null,
      isHydrated: false,
      setSession: ({ employee, access_token }) =>
        set({ employee, accessToken: access_token }),
      logout: () => set({ employee: null, accessToken: null }),
      isAuthenticated: () => !!get().accessToken && !!get().employee,
      role: () => get().employee?.role || null,
    }),
    {
      name: "visitsarva-crm-auth",
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);
