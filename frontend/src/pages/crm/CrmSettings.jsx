import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Settings, Save } from "lucide-react";

export default function CrmSettings() {
  const [config, setConfig] = useState({
    company_name: "VisitSarva Real Estate",
    support_phone: "+91 98000 00000",
    support_email: "support@visitsarva.com",
    default_currency: "INR",
    auto_assignment_mode: "round_robin",
    require_site_visit_feedback: true,
    lead_expiry_days: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    crmApi.get("/settings")
      .then((res) => setConfig(res.data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crmApi.post("/settings", config);
      toast.success("CRM settings updated");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM System Settings</h1>
        <p className="text-sm text-gray-500">Configure business parameters, assignment rules, and company defaults</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading configuration...</div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={config.company_name}
              onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Support Phone</label>
              <input
                type="text"
                value={config.support_phone}
                onChange={(e) => setConfig({ ...config, support_phone: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={config.support_email}
                onChange={(e) => setConfig({ ...config, support_email: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lead Auto-Assignment Mode</label>
            <select
              value={config.auto_assignment_mode}
              onChange={(e) => setConfig({ ...config, auto_assignment_mode: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none"
            >
              <option value="round_robin">Round Robin</option>
              <option value="manual">Manual Assignment Only</option>
              <option value="territory">Territory Based</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}
