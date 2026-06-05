import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Global Scroll Restoration System
 * 
 * Ensures that when navigating to a new page (PUSH or REPLACE), the window
 * automatically scrolls to the top.
 * 
 * Preserves the native browser scroll restoration for back/forward navigation (POP).
 * Does not affect internal modal/dialog scrolls since they do not change the route.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Only scroll to top on new navigation, allow browser to handle POP (back/forward) natively
    if (navType !== "POP") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [pathname, navType]);

  return null;
}
