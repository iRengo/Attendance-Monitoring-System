import React, { useEffect } from "react";

export default function PreviewModal({ preview, setPreview }) {
  if (!preview) return null;

  const previewUrl = typeof preview === "string" ? preview : String(preview);

  const isImage = (url) =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i.test(url);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [setPreview]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80"
      onClick={() => setPreview(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-screen h-screen"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setPreview(null)}
          className="absolute top-4 right-4 z-[101] inline-flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 w-10 h-10"
          aria-label="Close preview"
          title="Close"
        >
          ✕
        </button>

        {/* Open in new tab */}
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 left-4 z-[101] px-3 py-1.5 rounded bg-white/90 text-gray-900 hover:bg-white"
        >
          Open in new tab
        </a>

        {/* Fullscreen content */}
        {isImage(previewUrl) ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="File Preview"
            className="w-full h-full"
            style={{ border: 0 }}
            loading="lazy"
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  );
}