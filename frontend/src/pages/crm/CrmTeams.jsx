import React, { useState, useEffect } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import {
  Users, Plus, Shield, Search, RefreshCw, UserCheck, Layers, Award,
  Pencil, UserPlus, X, Trash2, UserMinus, PlusCircle
} from "lucide-react";
import toast from "react-hot-toast";

function OrgHierarchyVisual({ currentRole }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl mb-6">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">Organizational Reporting Structure</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforced Role Hierarchy: Founder → BDO → Team Leader → Executive & Trainee
          </p>
        </div>
        <span className="text-xs px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono uppercase">
          Active Hierarchy
        </span>
      </div>

      {/* Visual Hierarchy Diagram */}
      <div className="flex flex-col items-center justify-center space-y-4 py-2">
        {/* Level 1: FOUNDER */}
        <div className="flex flex-col items-center">
          <div className="px-6 py-2.5 bg-amber-500/20 border border-amber-400/40 text-amber-200 rounded-xl font-bold text-sm shadow-lg backdrop-blur-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>FOUNDER</span>
            <span className="text-xs font-normal text-amber-300/80">(sanjayj@visitsarva.com)</span>
          </div>
          <div className="w-0.5 h-6 bg-slate-600 my-1" />
        </div>

        {/* Level 2: BDO */}
        <div className="flex flex-col items-center">
          <div className="px-6 py-2.5 bg-orange-500/20 border border-orange-400/40 text-orange-200 rounded-xl font-bold text-sm shadow-lg backdrop-blur-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            <span>BDO</span>
            <span className="text-xs font-normal text-orange-300/80">(lakshmi@visitsarva.com)</span>
          </div>
          <div className="w-0.5 h-6 bg-slate-600 my-1" />
        </div>

        {/* Level 3: TEAM ACHIEVERS / TEAM LEADER */}
        <div className="flex flex-col items-center w-full max-w-lg">
          <div className="w-full bg-slate-800/80 border border-purple-500/30 rounded-xl p-3 flex flex-col items-center text-center shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950/60 px-3 py-0.5 rounded-full border border-purple-500/30 mb-2">
              TEAM ACHIEVERS
            </span>
            <div className="px-5 py-1.5 bg-purple-500/20 border border-purple-400/40 text-purple-200 rounded-lg font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-300" />
              <span>TEAM LEADER</span>
              <span className="text-xs font-normal text-purple-300/80">(varun@visitsarva.com)</span>
            </div>
          </div>

          {/* Connection lines down to Members */}
          <div className="w-0.5 h-6 bg-slate-600 my-1" />
          <div className="w-2/3 h-0.5 bg-slate-600" />
          <div className="flex justify-between w-2/3">
            <div className="w-0.5 h-4 bg-slate-600" />
            <div className="w-0.5 h-4 bg-slate-600" />
          </div>
        </div>

        {/* Level 4: EXECUTIVE & TRAINEE */}
        <div className="flex items-center justify-center gap-6 w-full max-w-lg">
          <div className="flex-1 px-4 py-2 bg-blue-500/20 border border-blue-400/40 text-blue-200 rounded-xl text-center shadow-md">
            <div className="font-bold text-xs">EXECUTIVE</div>
            <div className="text-[11px] text-blue-300/80">Ramachari</div>
          </div>
          <div className="flex-1 px-4 py-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 rounded-xl text-center shadow-md">
            <div className="font-bold text-xs">TRAINEE</div>
            <div className="text-[11px] text-emerald-300/80">Rehan</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTeamLeaderModal({ onClose, onSuccess, currentUserId }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    department: "Sales Management",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        role: "team_lead",
        reporting_manager: currentUserId,
      };
      const res = await crmApi.post("/employees", payload);
      toast.success(`Team Leader account ${res.data.employee_id || ""} created!`);
      if (onSuccess) onSuccess(res.data?.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create Team Leader account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Create Team Leader Account</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              placeholder="e.g. ramesh@visitsarva.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={set("phone")}
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={set("department")}
                placeholder="Sales Management"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={set("password")}
              placeholder="Set secure password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Team Leader"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateMemberAccountModal({ team, onClose, onSuccess, currentUserId }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "executive",
    department: "Sales Team",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        team_id: team.id,
        reporting_manager: team.team_leader_id || currentUserId,
      };
      const res = await crmApi.post("/employees", payload);
      toast.success(`Account ${res.data.employee_id || ""} created and assigned to ${team.name}!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Create New Team Member Account</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Suresh V"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              placeholder="e.g. suresh@visitsarva.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={set("phone")}
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={set("role")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                <option value="executive">Executive</option>
                <option value="trainee">Trainee</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={set("password")}
              placeholder="Set secure password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create & Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTeamModal({ team, onClose, onSuccess, canReassignLeader, employees, currentUserId }) {
  const [name, setName] = useState(team.name || "");
  const [status, setStatus] = useState(team.status || "active");
  const [teamLeaderId, setTeamLeaderId] = useState(team.team_leader_id || "");
  const [members, setMembers] = useState(team.members || []);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAddEmpId, setSelectedAddEmpId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);

  // Available employees to add: roles 'executive' or 'trainee' not already in this team
  const memberIds = new Set(members.map((m) => m.id));
  const availableEmployees = employees.filter(
    (e) => ["executive", "trainee"].includes(e.role) && !memberIds.has(e.id)
  );

  const handleAddMember = async (empIdToAdd) => {
    const targetId = empIdToAdd || selectedAddEmpId;
    if (!targetId) {
      toast.error("Please select an employee to add.");
      return;
    }
    setAddingMember(true);
    try {
      await crmApi.post(`/teams/${team.id}/members`, { employee_id: targetId });
      toast.success("Team member added successfully!");
      setSelectedAddEmpId("");
      onSuccess();
      const res = await crmApi.get(`/teams/${team.id}`);
      setMembers(res.data.members || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add member to team");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from ${team.name}?`)) {
      return;
    }
    try {
      await crmApi.delete(`/teams/${team.id}/members/${memberId}`);
      toast.success(`${memberName} removed from team`);
      onSuccess();
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove team member");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Team name cannot be empty");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        status: status,
      };
      if (canReassignLeader && teamLeaderId) {
        payload.team_leader_id = teamLeaderId;
      }
      await crmApi.patch(`/teams/${team.id}`, payload);
      toast.success("Team details updated successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update team details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {showCreateMemberModal && (
        <CreateMemberAccountModal
          team={team}
          onClose={() => setShowCreateMemberModal(false)}
          onSuccess={async () => {
            onSuccess();
            const res = await crmApi.get(`/teams/${team.id}`);
            setMembers(res.data.members || []);
          }}
          currentUserId={currentUserId}
        />
      )}

      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Edit Team Details & Members</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Team Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Team Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {canReassignLeader && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reassign Team Leader</label>
              <select
                value={teamLeaderId}
                onChange={(e) => setTeamLeaderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role}) - {emp.employee_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manage Members Section */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Team Members ({members.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCreateMemberModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Create New Member Account
              </button>
            </div>

            {/* List current members */}
            {members.length === 0 ? (
              <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg text-center">
                No members currently assigned to this team.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <div>
                      <span className="font-semibold text-gray-900">{m.name}</span>
                      <span className="text-gray-400 ml-2">({m.email})</span>
                      <span className={`ml-2 px-2 py-0.5 rounded font-medium text-[10px] ${
                        m.role === "executive" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {m.role === "executive" ? "Executive" : "Trainee"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Remove from team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Existing Member Selector */}
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-2 mt-2">
              <label className="block text-xs font-semibold text-blue-900">Add Existing Member to Team</label>
              <div className="flex gap-2">
                <select
                  value={selectedAddEmpId}
                  onChange={(e) => setSelectedAddEmpId(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="">Select Executive or Trainee...</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - {emp.employee_id || emp.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddMember()}
                  disabled={!selectedAddEmpId || addingMember}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmTeams() {
  const { employee } = useCrmAuthStore();
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateLeaderModal, setShowCreateLeaderModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // New team form state
  const [name, setName] = useState("");
  const [teamLeaderId, setTeamLeaderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const role = employee?.role;
  const canCreateTeam = ["founder", "admin", "bdo"].includes(role);
  const canCreateTeamLeader = ["founder", "admin", "bdo"].includes(role);
  const isTeamLeadRole = role === "team_lead";

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsRes, empRes] = await Promise.all([
        crmApi.get("/teams"),
        crmApi.get("/employees"),
      ]);
      const fetchedTeams = teamsRes.data || [];
      const fetchedEmps = empRes.data || [];

      // Enrich team detail with member records
      const enrichedTeams = await Promise.all(
        fetchedTeams.map(async (t) => {
          try {
            const detailRes = await crmApi.get(`/teams/${t.id}`);
            return detailRes.data;
          } catch {
            return t;
          }
        })
      );

      setTeams(enrichedTeams);
      setEmployees(fetchedEmps);
    } catch (err) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!name.trim() || !teamLeaderId) {
      toast.error("Please provide Team Name and select a Team Leader");
      return;
    }
    setSubmitting(true);
    try {
      const res = await crmApi.post("/teams", {
        name: name.trim(),
        team_leader_id: teamLeaderId,
      });
      toast.success(res.data?.message || "Team created successfully!");
      setName("");
      setTeamLeaderId("");
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMemberDirect = async (teamId, memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this team?`)) {
      return;
    }
    try {
      await crmApi.delete(`/teams/${teamId}/members/${memberId}`);
      toast.success(`${memberName} removed from team`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove member");
    }
  };

  const filteredTeams = teams.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.team_id?.toLowerCase().includes(term) ||
      t.team_leader?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Modals */}
      {showCreateLeaderModal && (
        <CreateTeamLeaderModal
          onClose={() => setShowCreateLeaderModal(false)}
          onSuccess={(newLeaderId) => {
            loadData();
            if (newLeaderId) setTeamLeaderId(newLeaderId);
          }}
          currentUserId={employee?.id}
        />
      )}

      {editingTeam && (
        <EditTeamModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSuccess={loadData}
          canReassignLeader={["founder", "admin", "bdo"].includes(role)}
          employees={employees}
          currentUserId={employee?.id}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Teams & Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organization teams, assigned team leaders, and reporting relationships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateTeamLeader && (
            <button
              onClick={() => setShowCreateLeaderModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create Team Leader
            </button>
          )}
          {canCreateTeam && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Team
            </button>
          )}
        </div>
      </div>

      {/* Visual Organizational Hierarchy Tree */}
      <OrgHierarchyVisual currentRole={role} />

      {/* Filter bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams by name or leader..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <button
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No teams found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
            {canCreateTeam
              ? "Create a team to manage Team Leaders, Executives, and Trainees."
              : "No team assigned to your scope."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeams.map((team) => {
            const canEditThisTeam =
              ["founder", "admin", "bdo"].includes(role) ||
              (isTeamLeadRole && (team.team_leader_id === employee?.id || team.id === employee?.team_id));

            return (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-md border border-purple-200">
                      {team.team_id || "VS-TEAM"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${team.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {team.status || "active"}
                      </span>
                      {canEditThisTeam && (
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Details & Members
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mt-3">{team.name}</h3>

                  {/* Team Leader */}
                  <div className="mt-4 p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-purple-700 font-semibold uppercase tracking-wide">
                      <span>Team Leader</span>
                      <Shield className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {team.team_leader?.name || "Varun"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {team.team_leader?.email || "varun@visitsarva.com"}
                    </p>
                  </div>

                  {/* Members list */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Team Members ({team.members?.length ?? team.member_count ?? 0})
                      </span>
                      {canEditThisTeam && (
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Member
                        </button>
                      )}
                    </div>

                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-2">
                        {team.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                            <div>
                              <span className="font-semibold text-gray-900">{m.name}</span>
                              <span className="text-gray-400 ml-2">({m.email})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                                m.role === "executive" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {m.role === "executive" ? "Executive" : m.role === "trainee" ? "Trainee" : m.role}
                              </span>
                              {canEditThisTeam && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMemberDirect(team.id, m.id, m.name)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove from team"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No assigned members yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>Created {team.created_at ? new Date(team.created_at).toLocaleDateString("en-IN") : "Recent"}</span>
                  <span className="font-mono text-gray-500">Managed by BDO & Team Leader</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Create New Team</h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TEAM ACHIEVERS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Assign Team Leader *</label>
                  {canCreateTeamLeader && (
                    <button
                      type="button"
                      onClick={() => setShowCreateLeaderModal(true)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      + New Leader Account
                    </button>
                  )}
                </div>
                <select
                  required
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - {emp.employee_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


