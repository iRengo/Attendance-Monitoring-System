import React, { useEffect, useMemo, useState } from "react";
import usePdfThumbnail from "./hooks/usePdfThumbnail";

const EXT_ICON_BG = {
  pdf: "bg-red-100 text-red-700 border-red-300",
  doc: "bg-blue-100 text-blue-700 border-blue-300",
  docx: "bg-blue-100 text-blue-700 border-blue-300",
  ppt: "bg-orange-100 text-orange-700 border-orange-300",
  pptx: "bg-orange-100 text-orange-700 border-orange-300",
  txt: "bg-gray-100 text-gray-700 border-gray-300",
  rtf: "bg-gray-100 text-gray-700 border-gray-300",
  xls: "bg-green-100 text-green-700 border-green-300",
  xlsx: "bg-green-100 text-green-700 border-green-300",
};

function getExtension(nameOrUrl = "") {
  const match = String(nameOrUrl).toLowerCase().match(/\.([a-z0-9]+)(?:$|\?|#)/);
  return match ? match[1] : "";
}

// Extract Cloudinary publicId from secure_url like:
// https://res.cloudinary.com/<cloud>/<resource>/upload/v123/post_uploads/file.pdf
function extractPublicIdFromCloudinaryUrl(url) {
  try {
    const u = new URL(url);
    // Capture everything after /upload/v<version>/
    const m = u.pathname.match(/\/upload\/v\d+\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export default function FileAttachmentCard({
  fileUrl,
  fileName,
  fileType,
  onPreview,
  className = "",
}) {
  const ext = getExtension(fileName || fileUrl);
  const isPdf = ext === "pdf";

  // 1) Request a signed Cloudinary image URL for page 1 (from backend)
  const [signedThumb, setSignedThumb] = useState(null);
  const [signedState, setSignedState] = useState("idle"); // idle | loading | ok | error

  useEffect(() => {
    let cancelled = false;
    setSignedThumb(null);
    setSignedState("idle");

    if (!isPdf || !fileUrl) return;

    const publicId = extractPublicIdFromCloudinaryUrl(fileUrl);
    if (!publicId) {
      setSignedState("error");
      return;
    }

    setSignedState("loading");
    (async () => {
      try {
        const res = await fetch(
          `/api/files/pdf-thumb?publicId=${encodeURIComponent(publicId)}&w=92&h=92`
        );        
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data?.url) {
            setSignedThumb(data.url);
            setSignedState("ok");
          } else {
            setSignedState("error");
          }
        }
      } catch {
        if (!cancelled) setSignedState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPdf, fileUrl]);

  // 2) Always kick off pdf.js thumbnail in parallel (so user isn’t blocked)
  const { thumb: pdfThumb, loading: pdfLoading } = usePdfThumbnail(
    isPdf ? fileUrl : null,
    { width: 92, height: 92 }
  );

  // 3) Choose thumbnail: prefer signed Cloudinary (fast, cached); else pdf.js
  const finalThumb = useMemo(() => signedThumb || pdfThumb || null, [signedThumb, pdfThumb]);

  const iconClass =
    EXT_ICON_BG[ext] || "bg-slate-100 text-slate-600 border-slate-300";

  return (
    <div
      className={`group flex items-stretch w-full rounded-xl border border-gray-300 hover:shadow-md transition cursor-pointer overflow-hidden ${className}`}
      onClick={() => onPreview?.(fileUrl, fileName)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onPreview?.(fileUrl, fileName)}
    >
      {/* Text */}
      <div className="flex-1 px-4 py-3 min-w-0 flex flex-col justify-center">
        <a
          href={fileUrl}
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sm text-blue-700 underline decoration-blue-400 underline-offset-2 truncate hover:text-blue-800"
          title={fileName}
        >
          {fileName || "Attachment"}
        </a>
        <span className="mt-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {ext || (fileType || "FILE")}
        </span>
      </div>

      {/* Thumbnail / badge */}
      <div className="w-28 h-full border-l border-gray-200 bg-white flex items-center justify-center p-2 relative">
        {isPdf ? (
          finalThumb ? (
            <img
              src={finalThumb}
              alt="PDF page 1"
              className="w-full h-full object-cover rounded-md border border-gray-200"
              draggable="false"
              onError={() => {
                // if signed thumb errors, let pdf.js still show if ready; if both fail, badge shows
                if (signedThumb) {
                  setSignedThumb(null);
                  setSignedState("error");
                }
              }}
            />
          ) : (pdfLoading || signedState === "loading") ? (
            <div className="w-16 h-16 flex items-center justify-center text-[10px] text-gray-400">
              Loading…
            </div>
          ) : (
            <div
              className={`w-16 h-16 flex items-center justify-center text-[11px] font-bold uppercase border rounded-md ${iconClass}`}
            >
              {ext || "FILE"}
            </div>
          )
        ) : (
          <div
            className={`w-16 h-16 flex items-center justify-center text-[11px] font-bold uppercase border rounded-md ${iconClass}`}
          >
            {ext || "FILE"}
          </div>
        )}
      </div>
    </div>
  );
}