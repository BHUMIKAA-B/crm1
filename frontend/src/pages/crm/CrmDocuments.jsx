import React, { useEffect, useState, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import {
  FolderGit2, FileText, CheckCircle2, AlertCircle, Plus,
  X, RefreshCw, Trash2, ExternalLink, Shield
} from "lucide-react";

const DOCUMENT_SERVICES = [
  "Legal Opinion & Title Search",
  "Encumbrance Certificate (EC) Retrieval",
  "Mother Deed Verification",
  "Khata Transfer & Mutation Service",
  "Sale Deed Draft & Registration",
  "Property Tax Audit & Clearance",
  "Layout Approval & RERA Verification",
  "General Document Service",
];

const DOC_TYPES = [
  "sale_deed", "mother_deed", "encumbrance_certificate", "khata",
  "tax_receipt", "conversion_doc", "approval_doc", "rtc",
  "layout_plan", "survey_doc", "legal_opinion", "agreement",
  "registration_doc", "other",
];

const ENTITY_TYPES = [
  { value: "property", label: "Property" },
  { value: "customer", label: "Customer" },
  { value: "deal", label: "Deal" },
  { value: "team", label: "Team (General)" },
];

// ── Add Document Modal ────────────────────────────────────────────────────
function AddDocumentModal({ onClose, onSuccess, role }) {
  const [form, setForm] = useState({
    title: "",
    entity_type: "team",
    entity_id: "",
    doc_type: "sale_deed",
    type_of_document_service: "Legal Opinion & Title Search",
    file_name: "",
    file_url: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.file_name || !form.file_url) {
      toast.error("Document file name and URL are required");
      return;
    }
    setLoading(true);
    try {
      await crmApi.post("/documents", form);
      toast.success("Document added successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add document");
    } finally {
      setLoading(false);
    }
  };

  const showEntityId = ["property", "customer", "deal"].includes(form.entity_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Add Document</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Document Title *</label>
            <input
              required
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Sale Deed — Plot 42, Layout ABC"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Related To</label>
              <select
                value={form.entity_type}
                onChange={set("entity_type")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-100"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {showEntityId && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Entity ID</label>
                <input
                  value={form.entity_id}
                  onChange={set("entity_id")}
                  placeholder={`e.g. VS-PROP-000001`}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Document Category *</label>
            <select
              value={form.doc_type}
              onChange={set("doc_type")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-100"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type of Document Service *</label>
            <select
              value={form.type_of_document_service}
              onChange={set("type_of_document_service")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white font-medium text-blue-700 focus:ring-2 focus:ring-indigo-100"
            >
              {DOCUMENT_SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">File Name *</label>
            <input
              required
              value={form.file_name}
              onChange={set("file_name")}
              placeholder="e.g. Title_Deed_Plot42_2026.pdf"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">File URL *</label>
            <input
              required
              type="url"
              value={form.file_url}
              onChange={set("file_url")}
              placeholder="https://drive.google.com/... or storage URL"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Verification details, legal notes, or remarks"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              This document will be associated with your team and will only be visible to authorized team members.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Add Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function CrmDocuments() {
  const { employee } = useCrmAuthStore();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const role = employee?.role;

  const canVerify = ["founder", "admin", "dpo", "bdo", "team_lead"].includes(role);
  const canDelete = ["founder", "admin", "bdo", "team_lead"].includes(role);
  const canAdd = !!role; // All authenticated employees can add documents for their team

  const fetchDocs = useCallback(() => {
    setLoading(true);
    crmApi.get("/documents")
      .then((res) => setDocs(res.data))
      .catch(() => toast.error("Failed to load document vault"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleVerify = async (docId, status) => {
    try {
      await crmApi.patch(`/documents/${docId}/verify`, null, { params: { status } });
      toast.success(`Document marked as ${status}`);
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update verification status");
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Delete document "${title || docId}"? This cannot be undone.`)) return;
    try {
      await crmApi.delete(`/documents/${docId}`);
      toast.success("Document deleted");
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete document");
    }
  };

  const verificationBadge = {
    verified: "bg-emerald-50 text-emerald-600",
    rejected: "bg-red-50 text-red-600",
    pending: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="space-y-6">
      {showAdd && (
        <AddDocumentModal
          onClose={() => setShowAdd(false)}
          onSuccess={fetchDocs}
          role={role}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Document Vault &amp; Services</h1>
          <p className="text-sm text-gray-500">
            Team documents — property deeds, EC certificates, legal verification &amp; service records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDocs}
            className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {canAdd && (
            <button
              id="btn-add-document"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Document
            </button>
          )}
        </div>
      </div>

      {/* Team restriction notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>Team-restricted view:</strong> You are seeing documents belonging to your team only.
          {["founder", "admin"].includes(role) && " As Founder/Admin, you can see all team documents."}
          {role === "bdo" && " As BDO, you can see documents for your authorized teams."}
        </p>
      </div>

      {/* Document Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center text-gray-500 border border-gray-100">
          <FolderGit2 className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-sm font-semibold text-gray-500">No documents available</p>
          <p className="text-xs text-gray-400 mt-1">Your team has no documents yet.</p>
          {canAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 inline mr-1.5" /> Add First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  {d.doc_type?.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${verificationBadge[d.verification_status] || verificationBadge.pending}`}>
                  {d.verification_status || "pending"}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {d.title || d.file_name}
                </h3>
                {d.title && d.file_name !== d.title && (
                  <p className="text-xs text-gray-400 truncate">{d.file_name}</p>
                )}
                <p className="text-xs font-mono text-blue-600">ID: {d.id?.slice(0, 8)}</p>
              </div>

              {/* Type of Document Service */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 text-xs space-y-1">
                <p className="font-semibold text-blue-900 uppercase text-[10px] tracking-wider">
                  Type of Document Service
                </p>
                <p className="font-medium text-blue-800">
                  {d.type_of_document_service || "General Document Verification"}
                </p>
              </div>

              <div className="text-xs text-gray-500 space-y-0.5">
                <p><strong>Related:</strong> {d.entity_type} {d.entity_id ? `(${d.entity_id})` : ""}</p>
                <p><strong>Uploaded:</strong> {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString("en-IN") : "—"}</p>
                {d.uploaded_by_name && <p><strong>By:</strong> {d.uploaded_by_name}</p>}
              </div>

              {d.notes && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">{d.notes}</p>
              )}

              {/* File link */}
              {d.file_url && (
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> View Document
                </a>
              )}

              {/* Actions */}
              {(canVerify || canDelete) && (
                <div className="flex gap-2 pt-1 border-t border-gray-50">
                  {canVerify && d.verification_status !== "verified" && (
                    <>
                      <button
                        onClick={() => handleVerify(d.id, "verified")}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />Verify
                      </button>
                      {d.verification_status !== "rejected" && (
                        <button
                          onClick={() => handleVerify(d.id, "rejected")}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(d.id, d.title || d.file_name)}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded text-xs transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
