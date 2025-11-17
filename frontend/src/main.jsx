import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

/* -----------------------------
   Remove Tracking URL Parameters
   (fbclid, gclid, utm_*, msclkid, etc.)
--------------------------------*/
const trackingParams = [
  "fbclid",
  "gclid",
  "msclkid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
];

const params = new URLSearchParams(window.location.search);
let changed = false;

trackingParams.forEach((param) => {
  if (params.has(param)) {
    params.delete(param);
    changed = true;
  }
});

// Only update URL if changes were made
if (changed) {
  const newQuery = params.toString();
  const cleanUrl =
    window.location.pathname + (newQuery ? `?${newQuery}` : "");
  window.history.replaceState({}, "", cleanUrl);
}

/* -----------------------------
   React App Mount
--------------------------------*/
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
