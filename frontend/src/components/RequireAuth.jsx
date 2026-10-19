import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export const RequireAuth = ({ roles, children }) => {
  const { user, accessToken, isHydrated } = useAuthStore();
  const location = useLocation();

  // Zustand persist rehydrates from localStorage asynchronously.
  // Show a spinner until the store is ready to avoid a false redirect.
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-vs-gold" size={28} />
      </div>
    );
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};
