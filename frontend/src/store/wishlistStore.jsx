import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "@/api/client";
import { useAuthStore } from "@/store/authStore";

const WishlistContext = createContext(null);
const STORAGE_KEY = "visitsarva-wishlist";

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  useEffect(() => {
    if (!accessToken) return;
    const guestIds = ids;
    api.get("/users/me/saved")
      .then(async ({ data }) => {
        if (guestIds.length) {
          await api.post("/users/me/saved/merge", { property_ids: guestIds });
        }
        const merged = await api.get("/users/me/saved");
        setIds((merged.data || []).map((property) => property.id));
        localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => {});
    // Merge once for a login transition; IDs are intentionally kept after merge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const toggle = useCallback(async (propertyId) => {
    const removing = ids.includes(propertyId);
    setIds((current) => removing
      ? current.filter((id) => id !== propertyId)
      : [...new Set([...current, propertyId])]);
    if (accessToken) {
      try {
        if (removing) await api.delete(`/users/me/saved/${propertyId}`);
        else await api.post(`/users/me/saved/${propertyId}`);
      } catch {
        toast.error("Could not update your wishlist");
      }
    }
    toast.success(removing ? "Removed from wishlist" : "Added to wishlist");
  }, [accessToken, ids]);

  const clear = useCallback(async () => {
    setIds([]);
    if (accessToken) {
      try {
        await api.delete("/users/me/saved");
      } catch {
        toast.error("Could not clear wishlist");
      }
    }
  }, [accessToken]);

  const value = useMemo(() => ({
    ids,
    count: ids.length,
    isSaved: (propertyId) => ids.includes(propertyId),
    toggle,
    clear,
  }), [ids, toggle, clear]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
