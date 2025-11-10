import { useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Use CDN worker to avoid bundler hassles
if (!GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";
}

/**
 * usePdfThumbnail(url, { width, height })
 * Renders the first page of a PDF into a small data URL (PNG).
 * It fetches the PDF as bytes and feeds pdf.js to avoid CORS issues with URL mode.
 *
 * Returns { thumb, loading, error }
 */
export default function usePdfThumbnail(url, { width = 92, height = 92 } = {}) {
  const [thumb, setThumb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setThumb(null);
    setError(null);

    if (!url || !/\.pdf(\?|#|$)/i.test(url)) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) throw new Error(`Fetch PDF failed: ${resp.status}`);
        const buf = await resp.arrayBuffer();
        if (cancelled) return;

        const task = getDocument({ data: new Uint8Array(buf) });
        const pdf = await task.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(width / viewport.width, height / viewport.height, 1);
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = Math.max(1, Math.floor(scaledViewport.width));
        canvas.height = Math.max(1, Math.floor(scaledViewport.height));

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        if (!cancelled) setThumb(canvas.toDataURL("image/png"));
      } catch (e) {
        if (!cancelled) {
          console.warn("pdf.js thumbnail failed:", e);
          setError(e?.message || "Failed to render PDF thumbnail");
          setThumb(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, width, height]);

  return { thumb, loading, error };
}