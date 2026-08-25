import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      setSession: ({ user, access_token, refresh_token }) =>
        set({ user, accessToken: access_token, refreshToken: refresh_token }),
      setAccessToken: (t) => set({ accessToken: t }),
      setUser: (u) => set({ user: u }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => !!get().accessToken && !!get().user,
      role: () => get().user?.role || null,
    }),
    {
      name: "visitsarva-auth",
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);
