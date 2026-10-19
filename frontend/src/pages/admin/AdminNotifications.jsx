import React, { useEffect, useState } from "react";
import { Bell, Trash2, CheckCheck, Loader2 } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

export default function AdminNotifications({ onRead }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/admin/notifications")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markRead = async (id) => {
    try {
      await api.put(`/admin/notifications/${id}/read`);
      load(); onRead?.();
    } catch { toast.error("Could not mark as read"); }
  };

  const markAllRead = async () => {
    try {
      await api.put("/admin/notifications/read-all");
      toast.success("All marked as read");
      load(); onRead?.();
    } catch { toast.error("Could not update notifications"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/notifications/${id}`);
      load(); onRead?.();
    } catch { toast.error("Could not delete notification"); }
  };

  const unread = items.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          Notifications
          {unread > 0 && (
            <span className="ml-2 bg-vs-gold text-white text-xs font-bold rounded-full px-2 py-0.5">{unread}</span>
          )}
        </h2>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-vs-gold hover:underline">
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {loading && <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-vs-gold" size={22} /></div>}

      {!loading && !items.length && (
        <div className="text-center py-20">
          <Bell size={48} className="text-vs-text-secondary mx-auto mb-3 opacity-40" />
          <h3 className="font-display font-semibold text-vs-text-primary">No notifications</h3>
          <p className="text-vs-text-secondary text-sm mt-1">You're all caught up.</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {items.map(n => (
            <div
              key={n.id}
              className={`card px-5 py-4 flex items-start gap-4 transition-colors ${!n.read ? "border-l-4 border-l-vs-gold" : ""}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-vs-gold/10" : "bg-vs-bg"}`}>
                <Bell size={15} className={!n.read ? "text-vs-gold" : "text-vs-text-secondary"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${!n.read ? "text-vs-text-primary" : "text-vs-text-secondary"}`}>
                  {n.title}
                </div>
                <div className="text-xs text-vs-text-secondary mt-0.5 line-clamp-2">{n.message}</div>
                <div className="text-xs text-vs-text-secondary mt-1">
                  {new Date(n.created_at).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Mark as read"
                    className="p-1.5 rounded hover:bg-vs-bg text-vs-text-secondary hover:text-vs-gold transition-colors"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => remove(n.id)}
                  title="Delete"
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-vs-text-secondary hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
