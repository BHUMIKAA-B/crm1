import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/api/client";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (error) {
      toast.error("Login failed: " + error);
      navigate("/login");
      return;
    }
    if (!code) {
      toast.error("Missing code");
      navigate("/login");
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/cognito/callback", { code });
        if (data?.access_token) {
          setSession({ user: data.user, access_token: data.access_token, refresh_token: data.refresh_token });
          toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
          navigate((location.state && location.state.from) || "/admin/dashboard");
        } else {
          toast.error("Login failed");
          navigate("/login");
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Login failed");
        navigate("/login");
      }
    })();
  }, [location.search]);

  return <div className="min-h-screen flex items-center justify-center">Signing you in…</div>;
};

export default AuthCallback;
