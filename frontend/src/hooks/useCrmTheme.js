import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "crm-theme";

/**
 * CRM-specific theme hook — independent of the public website theme.
 * Stores preference in localStorage under "crm-theme".
 * Returns: { crmTheme, toggleCrmTheme, setCrmTheme }
 */
export function useCrmTheme() {
  const [crmTheme, setCrmThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (crmTheme === "dark") {
        root.classList.add("dark");
        body.classList.add("dark");
        root.setAttribute("data-crm-theme", "dark");
        body.setAttribute("data-crm-theme", "dark");
      } else {
        root.classList.remove("dark");
        body.classList.remove("dark");
        root.setAttribute("data-crm-theme", "light");
        body.setAttribute("data-crm-theme", "light");
      }
    } catch (e) {}
  }, [crmTheme]);

  const setCrmTheme = useCallback((theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    setCrmThemeState(theme);
  }, []);

  const toggleCrmTheme = useCallback(() => {
    setCrmTheme(crmTheme === "dark" ? "light" : "dark");
  }, [crmTheme, setCrmTheme]);

  return { crmTheme, toggleCrmTheme, setCrmTheme };
}
