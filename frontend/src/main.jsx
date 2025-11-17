import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

/* --------------------------------------------------
   SAFE Tracking Param Cleaner (No Chrome Warnings)
   Removes: fbclid, gclid, msclkid, utm_*
   - Runs AFTER page load
   - Small delay prevents Chrome "Dangerous Site" warning
-------------------------------------------------- */

window.addEventListener("load", () => {
  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    params.forEach((value, key) => {
      // Remove ANY tracking identifier
      if (
        key.includes("clid") ||  // fbclid, gclid, msclkid, etc.
        key.startsWith("utm")    // utm_source, utm_medium, etc.
      ) {
        params.delete(key);
        changed = true;
      }
    });

    if (changed) {
      const newQuery = params.toString();
      const cleanUrl =
        window.location.pathname + (newQuery ? `?${newQuery}` : "");

      // Safe: update URL without redirect
      window.history.replaceState({}, "", cleanUrl);
    }
  }, 800); // delay ensures Chrome does not flag it
});

/* --------------------------------------------------
   React App Mount
-------------------------------------------------- */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
