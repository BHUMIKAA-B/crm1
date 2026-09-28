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
