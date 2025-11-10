import React from "react";
import FileAttachmentCard from "../../teacher/components/FileAttachmentCard";

export default function StudentPostsList({ posts, setPreview }) {
  const isImage = (nameOrUrl = "") =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i.test(String(nameOrUrl));
  const isOffice = (nameOrUrl = "") =>
    /\.(doc|docx|ppt|pptx|xls|xlsx)(\?|#|$)/i.test(String(nameOrUrl));
  const isPdf = (nameOrUrl = "") => /\.pdf(\?|#|$)/i.test(String(nameOrUrl));

  const previewUrlForAttachment = (att) => {
    const ref = (att?.name || att?.url || "").toLowerCase();

    if (isOffice(ref)) {
      // Microsoft Office Online Viewer for Office docs
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(att.url)}`;
    }
    if (isPdf(ref)) {
      // Mozilla PDF.js viewer for PDFs
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(att.url)}#pagemode=none`;
    }
    // Images and other types: open raw URL
    return att.url;
  };

  return (
    <>
      {posts.map((post) => {
        // Prefer attachments array; if absent, fallback to legacy single fields
        const attachments = Array.isArray(post.attachments) ? post.attachments : [];
        const legacyImage = post.imageUrl
          ? [
              {
                url: post.imageUrl,
                name: post.fileName,
                type: post.fileType,
                kind: "image",
                previewThumbUrl: null,
              },
            ]
          : [];
        const legacyFile = post.fileUrl
          ? [
              {
                url: post.fileUrl,
                name: post.fileName,
                type: post.fileType,
                kind: "file",
                previewThumbUrl: post.previewThumbUrl || null,
              },
            ]
          : [];
        const all = attachments.length ? attachments : [...legacyImage, ...legacyFile];

        return (
          <div
            key={post.id}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-5"
          >
            <p className="text-gray-800 mb-2 whitespace-pre-wrap">{post.content}</p>

            {all.length > 0 && (
              <div className="mt-3 space-y-2">
                {all.map((att, i) =>
                  att.kind === "image" || isImage(att.name || att.url) ? (
                    <div
                      key={i}
                      className="cursor-pointer"
                      onClick={() => setPreview(att.url)}
                    >
                      <img
                        src={att.previewThumbUrl || att.url}
                        alt={att.name || "image"}
                        className="rounded-lg max-h-64 object-cover border"
                        title={att.name}
                      />
                      {att.name && (
                        <div
                          className="text-xs text-gray-600 mt-1 truncate"
                          title={att.name}
                        >
                          {att.name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <FileAttachmentCard
                      key={i}
                      fileUrl={att.url}
                      fileName={att.name}
                      fileType={att.type}
                      previewThumbUrl={att.previewThumbUrl}
                      onPreview={() => setPreview(previewUrlForAttachment(att))}
                    />
                  )
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              {post.timestamp ? new Date(post.timestamp).toLocaleString() : ""}
            </p>
          </div>
        );
      })}
    </>
  );
}