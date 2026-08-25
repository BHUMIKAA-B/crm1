import React, { useEffect, useState, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import { FolderGit2, FileText, CheckCircle2, AlertCircle, Plus, X, RefreshCw } from "lucide-react";

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
  "registration_doc", "other"
];

function UploadDocumentModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    entity_type: "property",
    entity_id: "",
    doc_type: "sale_deed",
    type_of_document_service: "Legal Opinion & Title Search",
    file_name: "",
    file_url: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await crmApi.post("/documents", form);
      toast.success("Document uploaded successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Upload Legal Document</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Entity Type *</label>
              <select value={form.entity_type} onChange={set("entity_type")} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white">
                <option value="property">Property</option>
                <option value="customer">Customer</option>
                <option value="deal">Deal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Entity ID *</label>
              <input required value={form.entity_id} onChange={set("entity_id")} placeholder="e.g. VS-PROP-000001" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Document Category *</label>
            <select value={form.doc_type} onChange={set("doc_type")} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type of Document Service *</label>
            <select value={form.type_of_document_service} onChange={set("type_of_document_service")} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white font-medium text-blue-700">
              {DOCUMENT_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Document File Name *</label>
            <input required value={form.file_name} onChange={set("file_name")} placeholder="e.g. Title_Deed_Scan_2026.pdf" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">File URL *</label>
            <input required type="url" value={form.file_url} onChange={set("file_url")} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Verification details or legal notes" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Uploading…" : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmDocuments() {
  const { employee } = useCrmAuthStore();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const role = employee?.role;

  const fetchDocs = useCallback(() => {
    setLoading(true);
    crmApi.get("/documents")
      .then((res) => setDocs(res.data))
      .catch(() => toast.error("Failed to load document vault"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleVerify = async (docId, status) => {
    try {
      await crmApi.patch(`/documents/${docId}/verify`, null, { params: { status } });
      toast.success(`Document marked as ${status}`);
      fetchDocs();
    } catch {
      toast.error("Failed to update verification status");
    }
  };

  return (
    <div className="space-y-6">
      {showUpload && <UploadDocumentModal onClose={() => setShowUpload(false)} onSuccess={fetchDocs} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Document Vault & Services</h1>
          <p className="text-sm text-gray-500">Property deeds, EC certificates, customer legal verification & document service types</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDocs} className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading document vault...</div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No documents available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  {d.doc_type?.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                  d.verification_status === "verified" ? "bg-emerald-50 text-emerald-600"
                    : d.verification_status === "rejected" ? "bg-red-50 text-red-600"
                    : "bg-amber-50 text-amber-600"
                }`}>
                  {d.verification_status || "pending"}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-sm truncate">{d.file_name}</h3>
                <p className="text-xs font-mono text-blue-600">ID: {d.id?.slice(0, 8)}</p>
              </div>

              {/* Type of Document Service Field */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 text-xs space-y-1">
                <p className="font-semibold text-blue-900 uppercase text-[10px] tracking-wider">Type of Document Service</p>
                <p className="font-medium text-blue-800">{d.type_of_document_service || "General Document Verification"}</p>
              </div>

              <div className="text-xs text-gray-500 space-y-0.5">
                <p><strong>Entity:</strong> {d.entity_type} ({d.entity_id})</p>
                <p><strong>Uploaded:</strong> {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString("en-IN") : "—"}</p>
              </div>

              {["founder", "admin", "dpo", "bdo", "team_lead"].includes(role) && d.verification_status !== "verified" && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleVerify(d.id, "verified")} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold">
                    Verify Document
                  </button>
                  <button onClick={() => handleVerify(d.id, "rejected")} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
