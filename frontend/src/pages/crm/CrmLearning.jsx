import React, { useState, useEffect, useRef, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import {
  GraduationCap, Plus, Play, ShieldAlert, Trash2, Edit, CheckCircle, XCircle,
  Search, Video, FileText, Image as ImageIcon, Download, Users, CheckSquare, Square,
  X, File, Clock, Upload, Eye, FileSpreadsheet, Presentation
} from "lucide-react";

export default function CrmLearning() {
  const { employee } = useCrmAuthStore();
  const role = employee?.role;
  const isAdmin = ["founder", "bdo"].includes(role);

  const [materials, setMaterials] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Active view item state (for modal playback/viewing)
  const [activeItem, setActiveItem] = useState(null);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal State for Upload / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Modal Form State
  const [contentTypeTab, setContentTypeTab] = useState("file"); // 'file' | 'text'
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [isPublished, setIsPublished] = useState(true);

  // Recipient selector search
  const [recipientSearch, setRecipientSearch] = useState("");

  // Security Protection States
  const [isBlurred, setIsBlurred] = useState(false);
  const [securityWarning, setSecurityWarning] = useState("");
  const videoRef = useRef(null);

  // Fetch learning materials
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.get("/learning");
      setMaterials(res.data);
    } catch {
      toast.error("Failed to load learning content");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch registered CRM employees for recipient selector (Founder / BDO only)
  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await crmApi.get("/employees");
      // Only keep active accounts
      setEmployeesList(res.data.filter(e => e.status !== "exited" && e.status !== "suspended"));
    } catch (e) {
      console.error("Failed to load employees for recipient selection", e);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMaterials();
    fetchEmployees();
  }, [fetchMaterials, fetchEmployees]);

  // Log Security Event Helper
  const logSecurityEvent = useCallback(async (eventType, contentId = null) => {
    try {
      await crmApi.post("/learning/security-event", {
        learning_content_id: contentId || activeItem?.id || "",
        event_type: eventType
      });
    } catch (e) {
      console.warn("Failed to log security event", e);
    }
  }, [activeItem]);

  // Tab Switch & Window Blur Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        setSecurityWarning("Protected Learning Content: Screen capture or tab switching detected. View blurred.");
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        logSecurityEvent("TAB_SWITCH");
      } else {
        setIsBlurred(false);
      }
    };

    const handleWindowBlur = () => {
      setIsBlurred(true);
      setSecurityWarning("Protected Learning Content: Window lost focus.");
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      logSecurityEvent("WINDOW_BLUR");
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
      setSecurityWarning("");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [logSecurityEvent]);

  // Handle Keyboard Shortcut Intercepts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPrtScn = e.key === "PrintScreen" || e.keyCode === 44;
      const isWinShiftS = e.key === "S" && e.shiftKey && (e.metaKey || e.ctrlKey);
      const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5"].includes(e.key);

      if (isPrtScn || isWinShiftS || isMacScreenshot) {
        e.preventDefault();
        setIsBlurred(true);
        setSecurityWarning("Screenshot attempt blocked for learning content security.");
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        logSecurityEvent("SCREENSHOT_ATTEMPT");
        toast.error("Screenshot attempt blocked for compliance.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [logSecurityEvent]);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setTextContent("");
    setSelectedFile(null);
    setContentTypeTab("file");
    setSelectedRecipients([]);
    setIsPublished(true);
    setRecipientSearch("");
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setTextContent(item.text_content || "");
    setSelectedFile(null);
    setContentTypeTab(item.content_type === "text" ? "text" : "file");
    setSelectedRecipients(item.recipients || []);
    setIsPublished(item.is_published !== false);
    setRecipientSearch("");
    setShowModal(true);
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (contentTypeTab === "file" && !editingItem && !selectedFile) {
      toast.error("Please choose a file to upload");
      return;
    }

    if (contentTypeTab === "text" && !textContent.trim()) {
      toast.error("Text content is required");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content_type", contentTypeTab === "text" ? "text" : "video"); // Content type will be auto-detected by backend for files
      formData.append("description", description.trim());
      formData.append("text_content", textContent);
      formData.append("recipients", JSON.stringify(selectedRecipients));
      formData.append("is_published", isPublished);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      if (editingItem) {
        await crmApi.put(`/learning/${editingItem.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Learning content updated successfully");
      } else {
        await crmApi.post("/learning", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Learning content created successfully");
      }

      setShowModal(false);
      fetchMaterials();
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Failed to save learning content";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete (Founder / BDO only)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this learning content? This will remove all recipient access and data.")) return;
    try {
      await crmApi.delete(`/learning/${id}`);
      toast.success("Learning content deleted successfully");
      if (activeItem?.id === id) setActiveItem(null);
      fetchMaterials();
    } catch {
      toast.error("Failed to delete learning content");
    }
  };

  // Handle Toggle Publish
  const handleTogglePublish = async (id) => {
    try {
      await crmApi.patch(`/learning/${id}/publish`);
      toast.success("Publish status updated");
      fetchMaterials();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Open Active Item & Track View
  const handleOpenItem = async (item) => {
    setActiveItem(item);
    setIsBlurred(false);
    logSecurityEvent("CONTENT_ACCESS", item.id);

    // Record view for non-admin users
    try {
      await crmApi.post(`/learning/${item.id}/view`);
    } catch (e) {
      console.warn("View status recording error", e);
    }
  };

  // Helper for content type badges & icons
  const renderContentTypeBadge = (type) => {
    switch (type) {
      case "video":
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"><Video className="w-3 h-3" /> Video</span>;
      case "image":
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"><ImageIcon className="w-3 h-3" /> Image</span>;
      case "pdf":
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200"><File className="w-3 h-3" /> PDF</span>;
      case "document":
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"><FileText className="w-3 h-3" /> Document</span>;
      case "text":
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200"><FileText className="w-3 h-3" /> Text</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200"><File className="w-3 h-3" /> Material</span>;
    }
  };

  // Filtered materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || m.content_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Filtered employees for recipient selector
  const filteredEmployeesForSelector = employeesList.filter(e => {
    const q = recipientSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) ||
           e.role.toLowerCase().includes(q) ||
           (e.email && e.email.toLowerCase().includes(q)) ||
           (e.employee_id && e.employee_id.toLowerCase().includes(q));
  });

  const isAllSelected = filteredEmployeesForSelector.length > 0 &&
    filteredEmployeesForSelector.every(e => selectedRecipients.includes(e.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(employeesList.map(e => e.id));
    }
  };

  const handleToggleRecipient = (empId) => {
    if (selectedRecipients.includes(empId)) {
      setSelectedRecipients(selectedRecipients.filter(id => id !== empId));
    } else {
      setSelectedRecipients([...selectedRecipients, empId]);
    }
  };

  return (
    <div className="space-y-6 select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">VisitSarva Learning Hub</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Targeted employee training, compliance standards, and sales enablement documents.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Learning Content
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search learning content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["all", "video", "image", "pdf", "document", "text"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                typeFilter === t
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
              }`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Security Warning Overlay Banner */}
      {isBlurred && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800 shadow-md">
          <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 animate-bounce" />
          <div>
            <p className="font-semibold text-sm">Protected Content Security Alert</p>
            <p className="text-xs text-red-600">{securityWarning || "Screen capture or tab switching is prohibited."}</p>
          </div>
        </div>
      )}

      {/* Active Content Viewer Modal / Player */}
      {activeItem && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full p-6 text-white shadow-2xl relative border border-slate-800 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                {renderContentTypeBadge(activeItem.content_type)}
                <h2 className="text-xl font-bold text-white">{activeItem.title}</h2>
              </div>
              <button
                onClick={() => {
                  setActiveItem(null);
                  logSecurityEvent("CONTENT_CLOSE");
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Content Body */}
            <div className={`relative rounded-xl overflow-hidden bg-black flex items-center justify-center ${isBlurred ? "filter blur-xl pointer-events-none" : ""}`}>
              {/* Dynamic Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 opacity-20 select-none">
                <div className="text-right text-xs font-mono text-white tracking-widest uppercase">
                  {employee?.name} ({employee?.email})
                </div>
                <div className="text-center text-xs font-mono text-white tracking-widest opacity-40">
                  CONFIDENTIAL — VISITSARVA CRM — {employee?.id}
                </div>
                <div className="text-left text-xs font-mono text-white tracking-widest">
                  RESTRICTED ACCESS CONTENT
                </div>
              </div>

              {/* Video Player */}
              {activeItem.content_type === "video" && (
                <div className="w-full aspect-video flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    src={`/api/crm/learning/files/${activeItem.file_id}`}
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onPlay={() => logSecurityEvent("VIDEO_PLAY", activeItem.id)}
                    onPause={() => logSecurityEvent("VIDEO_PAUSE", activeItem.id)}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Image Viewer */}
              {activeItem.content_type === "image" && (
                <div className="max-h-[70vh] p-4 flex items-center justify-center overflow-auto bg-slate-950 w-full">
                  <img
                    src={`/api/crm/learning/files/${activeItem.file_id}`}
                    alt={activeItem.title}
                    className="max-h-[65vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* PDF Viewer */}
              {activeItem.content_type === "pdf" && (
                <div className="w-full h-[70vh] bg-slate-950">
                  <iframe
                    src={`/api/crm/learning/files/${activeItem.file_id}#toolbar=0`}
                    title={activeItem.title}
                    className="w-full h-full rounded-lg border-0"
                  />
                </div>
              )}

              {/* Document Download / Info Card */}
              {activeItem.content_type === "document" && (
                <div className="p-8 text-center bg-slate-950 w-full rounded-lg space-y-4">
                  <FileText className="w-16 h-16 text-amber-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-bold">{activeItem.file_name || activeItem.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeItem.file_size ? `${(activeItem.file_size / (1024 * 1024)).toFixed(2)} MB` : "Document File"}
                    </p>
                  </div>
                  <a
                    href={`/api/crm/learning/files/${activeItem.file_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition shadow-lg"
                  >
                    <Download className="w-4 h-4" /> Open / Download Document
                  </a>
                </div>
              )}

              {/* Text Reader */}
              {activeItem.content_type === "text" && (
                <div className="p-6 bg-slate-950 w-full rounded-lg max-h-[60vh] overflow-y-auto space-y-4 text-left">
                  <div className="prose prose-invert max-w-none text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {activeItem.text_content}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Description */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-300">{activeItem.description || "No description provided."}</p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>Created by: {activeItem.created_by_name || activeItem.created_by}</span>
                <span>Published: {new Date(activeItem.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse space-y-3">
              <div className="h-40 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No Learning Content Found</h3>
          <p className="text-sm text-gray-500 mt-1">There are currently no training materials assigned or matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition ${isBlurred ? "filter blur-sm" : ""}`}
            >
              {/* Card Header Preview */}
              <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                {renderContentTypeBadge(item.content_type)}

                <div className="flex items-center gap-2">
                  {!item.is_published && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold">
                      Draft
                    </span>
                  )}
                  {isAdmin && item.recipient_count !== undefined && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                      <Users className="w-3 h-3" /> {item.recipient_count} recipients
                    </span>
                  )}
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-3">{item.description || "No description provided."}</p>
                </div>

                {/* Status / View Info */}
                <div className="space-y-3">
                  {isAdmin ? (
                    <div className="text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 pt-3">
                      <span>Viewed by: <strong className="text-indigo-600 font-semibold">{item.viewed_count || 0} / {item.recipient_count || 0}</strong></span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-3">
                      <span className="text-indigo-600 font-medium">Assigned to you</span>
                      {item.has_viewed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Viewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> New Content
                        </span>
                      )}
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <button
                    onClick={() => handleOpenItem(item)}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {item.content_type === "video" ? "Watch Video" :
                     item.content_type === "image" ? "View Image" :
                     item.content_type === "pdf" ? "Open PDF" :
                     item.content_type === "document" ? "Open Document" : "Read Content"}
                  </button>

                  {/* Founder / BDO Admin Controls */}
                  {isAdmin && (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                      <button
                        onClick={() => handleTogglePublish(item.id)}
                        className={`inline-flex items-center gap-1 font-medium ${item.is_published ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {item.is_published ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {item.is_published ? "Published" : "Publish"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 rounded hover:bg-gray-100"
                          title="Edit content & recipients"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                          title="Delete content"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Redesigned Upload / Edit Modal (Founder & BDO only) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? "Edit Learning Content" : "Create Learning Content"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Property Documentation & Title Deed Verification"
                />
              </div>

              {/* Content Type Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Content Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setContentTypeTab("file")}
                    className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      contentTypeTab === "file"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File (Video/Image/PDF/Doc)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentTypeTab("text")}
                    className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      contentTypeTab === "text"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Text Content
                  </button>
                </div>
              </div>

              {/* File Input */}
              {contentTypeTab === "file" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Upload Content File {editingItem ? "(Leave blank to keep existing file)" : "<span className='text-red-500'>*</span>"}
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-indigo-400 transition bg-slate-50/50">
                    <input
                      type="file"
                      id="learning-file-upload"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                    />
                    <label htmlFor="learning-file-upload" className="cursor-pointer flex flex-col items-center gap-1">
                      <Upload className="w-8 h-8 text-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-600">
                        {selectedFile ? selectedFile.name : "Click to select a file from your computer"}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Supports MP4, WebM, MOV, JPG, PNG, WEBP, PDF, DOCX, PPTX, XLSX, TXT (Max 100MB)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Text Content */}
              {contentTypeTab === "text" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Text Content <span className="text-red-500">*</span></label>
                  <textarea
                    rows={5}
                    required
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-sans"
                    placeholder="Enter training guidelines, steps, client scripts, or instructions here..."
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Summary / Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Short description of what recipients will learn..."
                />
              </div>

              {/* Recipient Selector ("Share With") */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" /> Share With (Select CRM Users) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {selectedRecipients.length} users selected
                  </span>
                </div>

                {/* Recipient Search & Select All */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, role, email..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                  >
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Employee List with Checkboxes */}
                <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                  {filteredEmployeesForSelector.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No matching CRM users found</div>
                  ) : (
                    filteredEmployeesForSelector.map(empItem => {
                      const isChecked = selectedRecipients.includes(empItem.id);
                      return (
                        <div
                          key={empItem.id}
                          onClick={() => handleToggleRecipient(empItem.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition text-xs ${
                            isChecked ? "bg-indigo-50/60" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{empItem.name}</p>
                              <p className="text-[11px] text-gray-500">{empItem.email || empItem.employee_id}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            {empItem.role}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Publish immediately checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_published_cb"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="is_published_cb" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Publish immediately to selected recipients
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editingItem ? "Save Changes" : "Publish Content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
