let cachedPSGC = null;

export async function loadPSGC() {
  if (cachedPSGC) return cachedPSGC;

  // Works in Vite dev and build; the version param busts cache
  const url = `${import.meta.env.BASE_URL}psgc.json?v=20251108`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }``

  // Prefer JSON if server sets the content-type    
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    cachedPSGC = await res.json();
    return cachedPSGC;
  }

  // Fallback: parse text (and guard against index.html fallback)
  const text = await res.text();
  if (text.trim().startsWith("<")) {
    // You’re getting HTML (likely index.html) instead of JSON
    throw new Error(`Got HTML instead of JSON from ${url}`);
  }

  cachedPSGC = JSON.parse(text);
  return cachedPSGC;
}