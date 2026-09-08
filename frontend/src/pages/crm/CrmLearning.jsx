import React, { useState, useEffect, useRef, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import {
  GraduationCap, Plus, Play, Pause, Lock, ShieldAlert, Eye, EyeOff,
  Trash2, Edit, CheckCircle, XCircle, Search, Video, FileText, AlertTriangle
} from "lucide-react";

export default function CrmLearning() {
  const { employee } = useCrmAuthStore();
  const role = employee?.role;
  const isAdmin = ["founder", "admin", "bdo"].includes(role);

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State for Upload / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Sales Training",
    video_url: "",
    thumbnail_url: "",
    is_published: true
  });

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

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Log Security Event Helper
  const logSecurityEvent = useCallback(async (eventType, contentId = null) => {
    try {
      await crmApi.post("/learning/security-event", {
        learning_content_id: contentId || activeVideo?.id || "",
        event_type: eventType
      });
    } catch (e) {
      console.warn("Failed to log security event", e);
    }
  }, [activeVideo]);

  // Handle Tab Switch & Window Blur Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        setSecurityWarning("Protected Learning Content: Screen capture or tab switching detected. Page has been blurred.");
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
      setSecurityWarning("Protected Learning Content: Application window lost focus.");
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

  // Handle Keyboard Shortcut Intercepts (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPrtScn = e.key === "PrintScreen" || e.keyCode === 44;
      const isWinShiftS = e.key === "S" && e.shiftKey && (e.metaKey || e.ctrlKey);
      const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5"].includes(e.key);

      if (isPrtScn || isWinShiftS || isMacScreenshot) {
        e.preventDefault();
        setIsBlurred(true);
        setSecurityWarning("Screenshot or screen capture is not permitted in the Learning section.");
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        logSecurityEvent("SCREENSHOT_ATTEMPT");
        toast.error("Screenshot attempt blocked and logged for security compliance.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [logSecurityEvent]);

  // Handle Save / Update Content (Founder / BDO only)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await crmApi.put(`/learning/${editingItem.id}`, formData);
        toast.success("Learning material updated successfully");
      } else {
        await crmApi.post("/learning", formData);
        toast.success("Learning material added successfully");
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        title: "", description: "", category: "Sales Training",
        video_url: "", thumbnail_url: "", is_published: true
      });
      fetchMaterials();
    } catch {
      toast.error("Failed to save learning content");
    }
  };

  // Handle Delete (Founder / BDO only)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this learning item?")) return;
    try {
      await crmApi.delete(`/learning/${id}`);
      toast.success("Learning content deleted");
      if (activeVideo?.id === id) setActiveVideo(null);
      fetchMaterials();
    } catch {
      toast.error("Failed to delete item");
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

  const categories = ["all", ...Array.from(new Set(materials.map(m => m.category || "General")))];

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

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
            Official employee training videos, compliance standards, and sales enablement modules.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                title: "", description: "", category: "Sales Training",
                video_url: "", thumbnail_url: "", is_published: true
              });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Learning Material
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search learning material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Security Warning Overlay Banner */}
      {isBlurred && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800 shadow-md">
          <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 animate-bounce" />
          <div>
            <p className="font-semibold text-sm">Protected Learning Content Warning</p>
            <p className="text-xs text-red-600">{securityWarning || "Screen capture is strictly prohibited inside VisitSarva Learning."}</p>
          </div>
        </div>
      )}

      {/* Active Video Player Modal / Box */}
      {activeVideo && (
        <div className="bg-slate-950 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                {activeVideo.category || "Training"}
              </span>
              <h2 className="text-xl font-bold mt-1">{activeVideo.title}</h2>
            </div>
            <button
              onClick={() => {
                setActiveVideo(null);
                logSecurityEvent("VIDEO_PAUSE");
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition"
            >
              Close Player
            </button>
          </div>

          <div className={`relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center ${isBlurred ? "filter blur-xl pointer-events-none" : ""}`}>
            {/* Dynamic Watermark Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 opacity-25 select-none">
              <div className="text-right text-xs font-mono text-white tracking-widest uppercase">
                {employee?.name} ({employee?.email})
              </div>
              <div className="text-center text-sm font-mono text-white tracking-widest opacity-40">
                CONFIDENTIAL — VISITSARVA CRM — {employee?.id}
              </div>
              <div className="text-left text-xs font-mono text-white tracking-widest">
                DO NOT CAPTURE OR SHARE
              </div>
            </div>

            <video
              ref={videoRef}
              src={activeVideo.video_url}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onPlay={() => logSecurityEvent("VIDEO_PLAY", activeVideo.id)}
              onPause={() => logSecurityEvent("VIDEO_PAUSE", activeVideo.id)}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="mt-4">
            <p className="text-sm text-slate-300">{activeVideo.description}</p>
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
          <p className="text-sm text-gray-500 mt-1">There are currently no training materials matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition ${isBlurred ? "filter blur-sm" : ""}`}
            >
              {/* Card Thumbnail / Preview */}
              <div className="relative aspect-video bg-slate-900 flex items-center justify-center group overflow-hidden">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                ) : (
                  <Video className="w-12 h-12 text-slate-600" />
                )}

                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      setActiveVideo(item);
                      setIsBlurred(false);
                      logSecurityEvent("VIDEO_ACCESS", item.id);
                    }}
                    className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-500 hover:scale-110 transition"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                </div>

                {!item.is_published && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs px-2 py-0.5 rounded font-semibold">
                    Unpublished Draft
                  </span>
                )}
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                    {item.category || "Sales Training"}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-1 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                    <button
                      onClick={() => handleTogglePublish(item.id)}
                      className={`inline-flex items-center gap-1 font-medium ${item.is_published ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {item.is_published ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {item.is_published ? "Published" : "Draft"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({
                            title: item.title,
                            description: item.description,
                            category: item.category || "Sales Training",
                            video_url: item.video_url,
                            thumbnail_url: item.thumbnail_url || "",
                            is_published: item.is_published
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 rounded hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit Modal (Founder / BDO only) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editingItem ? "Edit Learning Content" : "Upload New Learning Content"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Closing High-Value Commercial Deals"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Sales Training">Sales Training</option>
                  <option value="Compliance">Compliance & Legal</option>
                  <option value="Onboarding">Employee Onboarding</option>
                  <option value="Site Visit Best Practices">Site Visit Best Practices</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Video Source URL (MP4 / WebM)</label>
                <input
                  type="url"
                  required
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://example.com/video.mp4"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Thumbnail Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Summary of what employees will learn from this module..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_published" className="text-xs font-medium text-gray-700">
                  Publish immediately for all employees
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  {editingItem ? "Save Changes" : "Upload Content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
