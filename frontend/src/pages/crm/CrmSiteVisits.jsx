import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { ClipboardList, Star, Plus, CheckCircle, XCircle, ExternalLink } from "lucide-react";

export default function CrmSiteVisits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    interested: true,
    rating: 5,
    price_feedback: "",
    location_feedback: "",
    reason_for_rejection: "",
    next_action: ""
  });

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/site-visits");
      setVisits(res.data);
    } catch {
      toast.error("Failed to load office visits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    try {
      await crmApi.post(`/site-visits/${selectedVisit.id}/feedback`, feedbackForm);
      toast.success("Office visit feedback submitted!");
      setSelectedVisit(null);
      fetchVisits();
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Office Visits & Customer Feedback</h1>
          <p className="text-sm text-gray-500">Track office visits and capture detailed feedback</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading office visits...</div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No office visits scheduled.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visits.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {v.visit_id || "VS-OV"}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                  v.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"
                }`}>
                  {v.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900">{v.customer?.name || "Customer Visit"}</h3>
                <p className="text-xs text-gray-500">{v.customer?.phone} · Scheduled: <strong>{v.date} at {v.time}</strong></p>
              </div>


              {/* Visited Properties */}
              {v.properties?.length > 0 && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg space-y-1">
                  <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Properties Discussed / Visited</p>
                  {v.properties.map((propId, idx) => (
                    <Link
                      key={propId}
                      to={`/properties/${propId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {v.property_titles?.[idx] || propId}
                    </Link>
                  ))}
                </div>
              )}

              {v.notes && <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg">{v.notes}</p>}

              {v.feedback ? (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800">Feedback Captured</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{v.feedback.rating}/5</span>
                    </div>
                  </div>
                  <p><strong>Interested:</strong> {v.feedback.interested ? "YES" : "NO"}</p>
                  {v.feedback.price_feedback && <p><strong>Price Note:</strong> {v.feedback.price_feedback}</p>}
                  {v.feedback.next_action && <p><strong>Next Action:</strong> {v.feedback.next_action}</p>}
                </div>
              ) : (
                <button
                  onClick={() => setSelectedVisit(v)}
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Submit Office Visit Feedback
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Office Visit Feedback</h2>
            <p className="text-xs text-gray-500">Customer: {selectedVisit.customer?.name}</p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Interested?</label>
                <select
                  value={feedbackForm.interested}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, interested: e.target.value === "true" })}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
                >
                  <option value="true">YES — Interested</option>
                  <option value="false">NO — Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rating (1 to 5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedbackForm.rating}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: parseInt(e.target.value) })}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price Feedback</label>
                <input
                  type="text"
                  value={feedbackForm.price_feedback}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, price_feedback: e.target.value })}
                  placeholder="e.g. Asking price is high, negotiable up to 1.4Cr"
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Next Recommended Action</label>
                <input
                  type="text"
                  value={feedbackForm.next_action}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, next_action: e.target.value })}
                  placeholder="e.g. Schedule negotiation with owner"
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
                >
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
