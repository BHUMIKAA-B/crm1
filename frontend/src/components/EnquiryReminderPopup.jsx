/**
 * EnquiryReminderPopup
 *
 * Shows one enquiry reminder per 60-second public-site cadence.
 * Timing rules:
 *   – The first reminder appears 60 seconds after entering the public site.
 *   – Later reminders stay anchored to that cadence, even if the dialog stays open.
 *   – Public-route navigation does not reset the timer.
 *   – A successful enquiry stops reminders for this browser session.
 *   – Only one scheduled callback and one dialog can exist at a time.
 *   – Does not appear on /crm, /admin, /login, /register, /auth routes.
 *   – Does not appear when another modal is likely to be in focus.
 *   – Respects prefers-reduced-motion.
 *
 * No extra npm packages required.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import ChatBotWidget from "./ChatBotWidget";
import ReactDOM from "react-dom";
import { useLocation } from "react-router-dom";
import { X, Loader2, Phone, Mail, MessageSquare, ArrowUpRight } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

/* ── Routes where the popup must NOT appear ────────────────────────────────── */
const BLOCKED_PREFIXES = ["/crm", "/admin", "/login", "/register", "/auth"];

function isBlockedRoute(pathname) {
  return BLOCKED_PREFIXES.some((p) => pathname.startsWith(p));
}

const SESSION_KEY = "vs_enquiry_submitted";

/* ── Inline form inside the popup ─────────────────────────────────────────── */
function PopupForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    contact_preference: "call",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/project-enquiries", {
        project_id: "general",
        project_title: "General Property Enquiry",
        project_location: "",
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        message: form.message.trim() || "Submitted via enquiry reminder popup.",
        contact_preference: form.contact_preference,
      });
      // data includes chat_session_id from backend
      const chatId = data?.chat_session_id || null;
      sessionStorage.setItem(SESSION_KEY, "1");
      toast.success("Enquiry submitted! Our team will contact you soon.");
      onSuccess(chatId);
    } catch {
      toast.error("Could not submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name *</label>
          <input
            className="input-field"
            placeholder="Your name"
            value={form.name}
            onChange={set("name")}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input
            className="input-field"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={set("phone")}
            required
            type="tel"
          />
        </div>
      </div>

      <div>
        <label className="label">
          Email <span className="text-vs-text-muted font-normal">(optional)</span>
        </label>
        <input
          className="input-field"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set("email")}
        />
      </div>

      <div>
        <label className="label">
          What are you looking for?{" "}
          <span className="text-vs-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          className="input-field min-h-[64px] resize-none"
          placeholder="E.g. 3 BHK apartment in Bangalore, budget ₹80L…"
          value={form.message}
          onChange={set("message")}
        />
      </div>

      {/* Preferred contact */}
      <div>
        <label className="label">Preferred Contact</label>
        <div className="flex gap-2">
          {[
            { v: "call", label: "Call", Icon: Phone },
            { v: "whatsapp", label: "WhatsApp", Icon: MessageSquare },
            { v: "email", label: "Email", Icon: Mail },
          ].map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setForm((f) => ({ ...f, contact_preference: v }))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                form.contact_preference === v
                  ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                  : "border-vs-border text-vs-text-secondary hover:border-vs-gold/50"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline flex-1 justify-center !py-2.5 order-2 sm:order-1"
          aria-label="Dismiss and remind me later"
        >
          Maybe Later
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 justify-center !py-2.5 flex items-center gap-2 order-1 sm:order-2"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowUpRight size={14} />
          )}
          {loading ? "Submitting…" : "Submit an Enquiry"}
        </button>
      </div>
    </form>
  );
}

/* ── Main popup dialog ─────────────────────────────────────────────────────── */
function ReminderDialog({ onDismiss, onSubmitted }) {
  const panelRef = useRef(null);

  /* Focus the panel when it opens */
  useEffect(() => {
    const prev = document.activeElement;
    panelRef.current?.focus();
    return () => {
      try {
        prev?.focus();
      } catch (_) {}
    };
  }, []);

  /* Trap Tab inside the dialog */
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      onDismiss();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onDismiss]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(2px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-popup-title"
      aria-describedby="enquiry-popup-desc"
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="modal-panel w-full max-w-md outline-none"
        style={{
          /* Slide up from bottom on mobile, fade+scale on desktop */
          animation: "vsPopupEnter 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-vs-border">
          <div className="flex-1 min-w-0">
            <h3
              id="enquiry-popup-title"
              className="font-display font-semibold text-vs-text-primary text-base leading-snug"
            >
              Couldn't find what you're looking for?
            </h3>
            <p
              id="enquiry-popup-desc"
              className="text-xs text-vs-text-secondary mt-1 leading-relaxed"
            >
              Tell us what you need. Submit an enquiry, and our team will
              contact you to help you find the right property.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-vs-text-muted hover:text-vs-text-primary transition-colors p-1 rounded-lg hover:bg-vs-surface"
            aria-label="Close enquiry reminder"
          >
            <X size={18} />
          </button>
        </div>

        <PopupForm onSuccess={onSubmitted} onCancel={onDismiss} />
      </div>

      <style>{`
        @keyframes vsPopupEnter {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes vsPopupEnter {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

/* ── Controller — manages the timer lifecycle ──────────────────────────────── */
const REMINDER_INTERVAL_MS = 60000;

function wasEnquirySubmitted() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export default function EnquiryReminderPopup() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const openRef = useRef(false);
  const submittedRef = useRef(wasEnquirySubmitted());
  const dueRef = useRef(false);
  const nextReminderAtRef = useRef(null);
  const timeoutRef = useRef(null);
  const routeIsBlocked = isBlockedRoute(location.pathname);

  const setPopupOpen = useCallback((nextOpen) => {
    openRef.current = nextOpen;
    setOpen(nextOpen);
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showDueReminder = useCallback(() => {
    if (
      !dueRef.current ||
      submittedRef.current ||
      openRef.current ||
      document.visibilityState === "hidden"
    ) {
      return;
    }

    const otherModals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    const active = document.activeElement;
    const isTyping =
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable);
    if (otherModals.length > 0 || isTyping) return;

    dueRef.current = false;
    setPopupOpen(true);
  }, [setPopupOpen]);

  useEffect(() => {
    if (routeIsBlocked || submittedRef.current) {
      clearTimer();
      dueRef.current = false;
      nextReminderAtRef.current = null;
      setPopupOpen(false);
      return undefined;
    }

    nextReminderAtRef.current = Date.now() + REMINDER_INTERVAL_MS;
    const scheduleNextDeadline = () => {
      const delay = Math.max(0, nextReminderAtRef.current - Date.now());
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        nextReminderAtRef.current += REMINDER_INTERVAL_MS;
        if (!submittedRef.current && !openRef.current) {
          dueRef.current = true;
          showDueReminder();
        }
        scheduleNextDeadline();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") showDueReminder();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleNextDeadline();

    return () => {
      clearTimer();
      dueRef.current = false;
      nextReminderAtRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [routeIsBlocked, clearTimer, setPopupOpen, showDueReminder]);

  useEffect(() => {
    if (!open && dueRef.current) showDueReminder();
  }, [open, showDueReminder]);

  const handleDismiss = useCallback(() => {
    setPopupOpen(false);
    showDueReminder();
  }, [setPopupOpen, showDueReminder]);

  const handleSubmitted = useCallback((sessionId) => {
    submittedRef.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {}
    clearTimer();
    setChatSessionId(sessionId);
    setShowChat(true); // ensure chatbot shows even if sessionId is null
    dueRef.current = false;
    setPopupOpen(false);
  }, [clearTimer, setPopupOpen]);

  if (showChat) {
    // Render the chatbot widget after successful enquiry (sessionId may be null)
    return <ChatBotWidget sessionId={chatSessionId} />;
  }

  if (!open || submittedRef.current) return null;

  return <ReminderDialog onDismiss={handleDismiss} onSubmitted={handleSubmitted} />;
}
