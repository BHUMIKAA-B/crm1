import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Building2, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { useCrmGatewayStore } from "../../store/crmGatewayStore";

/**
 * CRM Gateway Page (/crm-access)
 *
 * Layer 1 of CRM security. The user must enter the correct common CRM
 * password before they are forwarded to the employee login page.
 *
 * - Password is NEVER stored client-side
 * - Verification is handled exclusively by the backend
 * - On success: gateway token stored → redirect to /crm/login
 * - On wrong password: error shown, page stays, no CRM content revealed
 */
export default function CrmGateway() {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const setGateway = useCrmGatewayStore((s) => s.setGateway);
  const navigate = useNavigate();
  const location = useLocation();

  // After the gateway is passed, redirect to CRM login (or wherever was intended)
  const next =
    new URLSearchParams(location.search).get("next") || "/crm/login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await axios.post("/api/crm/auth/gate/verify", {
        password,
      });

      // Store the gateway token — never store or log the password itself
      setGateway(res.data.gateway_token, res.data.expires_in_seconds);

      // Navigate to CRM login (Layer 2 starts here)
      navigate(next, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setErrorMsg("Invalid CRM access password.");
      } else if (status === 503) {
        setErrorMsg(
          "CRM service is temporarily unavailable. Please try again."
        );
      } else if (!err.response) {
        setErrorMsg(
          "CRM service is temporarily unavailable. Please try again."
        );
      } else {
        setErrorMsg(detail || "Invalid CRM access password.");
      }
      // Clear the field so the user types again
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 shadow-lg shadow-amber-500/10 mb-5">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            VisitSarva CRM
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            Secure CRM Access
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <div className="w-2 h-2 rounded-full bg-amber-500/60" />
            <div className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="crm-gate-password"
                className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase"
              >
                CRM Access Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="crm-gate-password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter CRM access password"
                  className={`w-full pl-10 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 transition-all ${
                    errorMsg
                      ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50"
                      : "border-white/10 focus:ring-amber-500/20 focus:border-amber-500/40"
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-medium"
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 leading-snug">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              id="crm-gate-submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-5 pt-5 border-t border-white/5">
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              This is a restricted internal portal.
              <br />
              Unauthorized access attempts are logged.
            </p>
          </div>
        </div>

        {/* Back to site */}
        <p className="text-center text-xs text-slate-700 mt-6">
          <a
            href="/"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Return to public site
          </a>
        </p>
      </div>
    </div>
  );
}
