import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, AlertTriangle, Lock } from "lucide-react";
import crmApi from "../api/crmClient";

export default function ScreenshotGuard({ children, contentId = null }) {
  const [isBlueScreen, setIsBlueScreen] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const triggerSecurityAlert = useCallback((reason) => {
    // 1. Immediately turn screen solid blue & trigger alert state
    setIsBlueScreen(true);
    setShowAlertModal(true);
    const msg = `SECURITY ALERT: Screenshot attempt detected (${reason}). Taking screenshots or screen captures is strictly prohibited on VisitSarva CRM.`;
    setAlertMessage(msg);

    // 2. Wipe clipboard if possible
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Screenshot prohibited on VisitSarva CRM.").catch(() => {});
      }
    } catch (e) {}

    // 3. Log security event to backend
    try {
      crmApi.post("/learning/security-event", {
        learning_content_id: contentId || "",
        event_type: "SCREENSHOT_BLOCKED"
      }).catch(() => {});
    } catch (e) {}

    // 4. Trigger native browser alert pop-up
    setTimeout(() => {
      window.alert("🚨 SECURITY ALERT: Screenshot attempt detected!\n\nTaking screenshots is strictly prohibited on VisitSarva CRM. Your screen has been turned blue for security compliance.");
    }, 50);
  }, [contentId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPrtScn = e.key === "PrintScreen" || e.keyCode === 44;
      const isWinShiftS = (e.key === "S" || e.key === "s") && e.shiftKey && (e.metaKey || e.ctrlKey || e.altKey);
      const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5"].includes(e.key);
      const isPrint = (e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "P");
      const isDevToolsScreenshot = e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "C", "c", "J", "j", "S", "s"].includes(e.key));

      if (isPrtScn || isWinShiftS || isMacScreenshot || isPrint || isDevToolsScreenshot) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Key shortcut");
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        triggerSecurityAlert("PrintScreen keyup");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Turn screen blue when window/tab is hidden or snippet tool takes focus
        setIsBlueScreen(true);
        setShowAlertModal(true);
        setAlertMessage("Protected Content: Window lost focus or screen snippet tool activated.");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [triggerSecurityAlert]);

  const handleDismiss = () => {
    setIsBlueScreen(false);
    setShowAlertModal(false);
  };

  return (
    <>
      {/* CSS Rule for @media print to force blue screen during printing/screenshots */}
      <style>{`
        @media print {
          body {
            background-color: #0000ff !important;
            color: #0000ff !important;
          }
          body * {
            display: none !important;
          }
          html::before {
            content: "🚨 SCREENSHOTS & PRINTING PROHIBITED ON VISIT SARVA CRM";
            display: flex !important;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            background-color: #0000ff !important;
            color: #ffffff !important;
            font-size: 28px;
            font-weight: bold;
            text-align: center;
          }
        }
      `}</style>

      {/* SOLID BLUE SCREEN OVERLAY + ALERT POP-UP */}
      {isBlueScreen && (
        <div
          id="screenshot-blue-screen-overlay"
          className="fixed inset-0 z-[999999] text-white flex flex-col items-center justify-center p-6 select-none transition-all duration-75"
          style={{ backgroundColor: "#0033cc" }}
        >
          {/* Main Alert Card inside Blue Screen */}
          {showAlertModal && (
            <div className="bg-white text-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border-4 border-red-500 text-center animate-bounce-short z-[1000000]">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>

              <h3 className="text-xl font-extrabold text-red-600 tracking-wide uppercase">
                Security Alert: Screenshot Blocked!
              </h3>

              <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 text-left">
                <p className="text-xs text-red-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  Unauthorised Action Detected
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {alertMessage || "Taking screenshots, screen recording, or snippet capture is strictly prohibited on VisitSarva CRM."}
                </p>
              </div>

              <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                This security event has been logged for compliance auditing.
              </p>

              <button
                onClick={handleDismiss}
                className="mt-6 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Acknowledge & Resume
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Children UI (hidden when blue screen is active) */}
      <div className={isBlueScreen ? "filter blur-3xl opacity-0 pointer-events-none" : ""}>
        {children}
      </div>
    </>
  );
}
