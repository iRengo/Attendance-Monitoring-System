import React from "react";

export default function PreviewModal({ preview, setPreview }) {
  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex justify-center items-center z-50"
      onClick={() => setPreview(null)}
    >
      <div
        className="bg-white p-4 rounded-xl shadow-lg max-w-3xl w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setPreview(null)}
          className="absolute top-3 right-3 text-gray-600 hover:text-black"
        >
          ✕
        </button>

        {preview.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          <img
            src={preview}
            alt="Preview"
            className="max-h-[80vh] w-full object-contain rounded-lg"
          />
        ) : (
          <iframe
            src={preview}
            title="File Preview"
            className="w-full h-[80vh] rounded-lg"
          ></iframe>
        )}
      </div>
    </div>
  );
}