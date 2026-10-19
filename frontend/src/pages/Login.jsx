import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader as Loader2, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";
import { useAuthStore } from "@/store/authStore";

const Login = () => {
  const [role, setRole] = useState("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setSession(data);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
      const dest =
        location.state?.from ||
        (data.user.role === "seller"
          ? "/seller/dashboard"
          : data.user.role === "admin"
          ? "/admin/dashboard"
          : "/home");
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vs-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="card p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="font-display font-medium text-vs-text-primary text-2xl">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-vs-text-muted">
                Login to continue with VisitSarva
              </p>
            </div>

            <div className="flex p-1 bg-vs-surface rounded-lg border border-vs-border mb-8">
              {["buyer", "seller"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  data-testid={`login-role-${r}`}
                  className={`flex-1 py-2.5 text-sm rounded-md transition-all duration-300 ${
                    role === r
                      ? "bg-vs-gold text-vs-bg font-medium"
                      : "text-vs-text-muted hover:text-vs-text-secondary"
                  }`}
                >
                  I'm a {r === "buyer" ? "Buyer" : "Seller"}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
              <div>
                <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-2 block" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  data-testid="login-email"
                />
              </div>
              <div>
                <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-2 block" htmlFor="pw">Password</label>
                <div className="relative">
                  <input
                    id="pw"
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Your password"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vs-text-muted hover:text-vs-gold transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="btn-primary w-full justify-center"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {role === "buyer" ? "Login as Buyer" : "Login as Seller"}
              </button>
            </form>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  const domain = process.env.REACT_APP_COGNITO_DOMAIN;
                  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
                  const redirect = process.env.REACT_APP_COGNITO_REDIRECT_URI || `${window.location.origin}/auth/callback`;
                  if (!domain || !clientId) {
                    toast.error('Cognito not configured');
                    return;
                  }
                  const url = `https://${domain}/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=openid+profile+email`;
                  window.location.href = url;
                }}
                className="btn-outline w-full justify-center"
              >
                Sign in with VisitSarva (Hosted)
              </button>
            </div>

            <div className="mt-8 text-center text-sm text-vs-text-muted">
              Don't have an account?{" "}
              <Link to="/register" className="text-vs-gold font-medium hover:text-vs-primary-hover transition-colors">
                Sign up
              </Link>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
