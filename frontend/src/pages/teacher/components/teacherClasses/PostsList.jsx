import React, { useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Pencil, Trash2 } from "lucide-react";
import FileAttachmentCard from "../FileAttachmentCard";

export default function PostsList({
  posts,
  setPreview,
  teacherId,           // optional; fallback to post.teacherId
  classId,             // optional; fallback to post.classId
  onPostUpdated,
  onPostDeleted,
}) {
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedText, setEditedText] = useState("");

  // Optimistic overlays
  const [localEdits, setLocalEdits] = useState({});
  const [localDeleted, setLocalDeleted] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isImage = (nameOrUrl = "") =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i.test(String(nameOrUrl));
  const isOffice = (nameOrUrl = "") =>
    /\.(doc|docx|ppt|pptx|xls|xlsx)(\?|#|$)/i.test(String(nameOrUrl));
  const isPdf = (nameOrUrl = "") => /\.pdf(\?|#|$)/i.test(String(nameOrUrl));

  const previewUrlForAttachment = (att) => {
    const ref = (att?.name || att?.url || "").toLowerCase();
    if (isOffice(ref)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(att.url)}`;
    }
    if (isPdf(ref)) {
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(att.url)}#pagemode=none`;
    }
    return att.url;
  };

  const resolveTeacherId = (post) => teacherId || post?.teacherId || null;
  const resolveClassId = (post) => classId || post?.classId || null;

  const displayedPosts = useMemo(() => {
    const filtered = posts.filter((p) => !localDeleted[p.id]);
    return filtered.map((p) =>
      localEdits[p.id] ? { ...p, ...localEdits[p.id] } : p
    );
  }, [posts, localDeleted, localEdits]);

  const startEdit = (post) => {
    setEditingPostId(post.id);
    setEditedText(localEdits[post.id]?.content ?? post.content ?? "");
  };
  const cancelEdit = () => {
    setEditingPostId(null);
    setEditedText("");
  };

  async function saveEdit(post) {
    const tId = resolveTeacherId(post);
    const cId = resolveClassId(post);
    if (!tId || !cId) {
      await Swal.fire({ icon: "error", title: "Missing info", text: "teacherId or classId missing." });
      return;
    }

    const prevOverlay = localEdits[post.id];
    setLocalEdits((prev) => ({ ...prev, [post.id]: { ...(prev[post.id] || {}), content: editedText } }));
    setSavingId(post.id);

    try {
      const res = await axios.put(
        `/api/teacher/update-post/${encodeURIComponent(cId)}/${encodeURIComponent(post.id)}`,
        { teacherId: tId, content: editedText }
    );    
      if (res.data?.success) {
        onPostUpdated?.(res.data.post);
        setEditingPostId(null);
        setEditedText("");
      } else {
        throw new Error(res.data?.message || "Failed to update post");
      }
    } catch (err) {
      setLocalEdits((prev) => ({ ...prev, [post.id]: prevOverlay }));
      await Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Failed to update post." });
    } finally {
      setSavingId(null);
    }
  }

  async function deletePost(post) {
    const tId = resolveTeacherId(post);
    const cId = resolveClassId(post);
    if (!tId || !cId) {
      await Swal.fire({ icon: "error", title: "Missing info", text: "teacherId or classId missing." });
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete post?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
    });
    if (!confirm.isConfirmed) return;

    setLocalDeleted((prev) => ({ ...prev, [post.id]: true }));
    setDeletingId(post.id);

    try {
      const res = await axios.delete(
        `/api/teacher/delete-post/${encodeURIComponent(cId)}/${encodeURIComponent(post.id)}`,
        {
            params: { teacherId: tId }
        }
    );    
      if (res.data?.success) {
        onPostDeleted?.(post.id);
      } else {
        throw new Error(res.data?.message || "Failed to delete post");
      }
    } catch (err) {
      setLocalDeleted((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      await Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Failed to delete post." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {displayedPosts.length === 0 ? (
        <p className="text-gray-400 text-center">No posts yet.</p>
      ) : (
        displayedPosts.map((post) => {
          const attachments = Array.isArray(post.attachments) ? post.attachments : [];
          const legacyImage = post.imageUrl
            ? [{ url: post.imageUrl, name: post.fileName, type: post.fileType, kind: "image", previewThumbUrl: null }]
            : [];
          const legacyFile = post.fileUrl
            ? [{ url: post.fileUrl, name: post.fileName, type: post.fileType, kind: "file", previewThumbUrl: post.previewThumbUrl || null }]
            : [];
          const all = attachments.length ? attachments : [...legacyImage, ...legacyFile];

          const isEditing = editingPostId === post.id;
          const tIdResolved = resolveTeacherId(post);
          const cIdResolved = resolveClassId(post);
          const disableActions = !tIdResolved || !cIdResolved || deletingId === post.id;

          return (
            <div key={post.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {!isEditing ? (
                    <p className="text-gray-800 mb-2 whitespace-pre-wrap">{post.content}</p>
                  ) : (
                    <div className="mb-2">
                      <textarea
                        rows={3}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:ring-2 focus:ring-[#3498db] outline-none resize-y"
                        placeholder="Edit your post..."
                      />
                      {/* TEXT buttons (no icons) */}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => saveEdit(post)}
                          disabled={disableActions || savingId === post.id}
                          className={`px-4 py-1.5 rounded text-sm font-medium ${
                            disableActions || savingId === post.id
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-[#3498db] text-white hover:bg-[#2f89ca]"
                          }`}
                        >
                          {savingId === post.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-1.5 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Back
                        </button>
                      </div>
                      {disableActions && (
                        <p className="mt-2 text-xs text-red-600">
                          Cannot save: {!tIdResolved ? "teacherId " : ""}{!tIdResolved && !cIdResolved ? "and " : ""}{!cIdResolved ? "classId" : ""} missing.
                        </p>
                      )}
                    </div>
                  )}

                  {all.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {all.map((att, i) =>
                        att.kind === "image" || isImage(att.name || att.url) ? (
                          <div key={i} className="cursor-pointer" onClick={() => setPreview(att.url)}>
                            <img
                              src={att.previewThumbUrl || att.url}
                              alt={att.name || "image"}
                              className="rounded-lg max-h-64 object-cover border"
                              title={att.name}
                            />
                            {att.name && (
                              <div className="text-xs text-gray-600 mt-1 truncate" title={att.name}>
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

                  <p className="text-xs text-gray-400 mt-3">{new Date(post.timestamp).toLocaleString()}</p>
                </div>

                {/* Simple icon-only Edit/Delete (always visible) */}
                {!isEditing && (
                  <div className="flex items-center gap-3 ml-2">
                    <Pencil
                      size={20}
                      className={`cursor-pointer ${disableActions ? "opacity-40 pointer-events-none text-gray-400" : "text-indigo-600 hover:text-indigo-700"}`}
                      title="Edit post"
                      aria-label="Edit post"
                      onClick={() => !disableActions && startEdit(post)}
                    />
                    <Trash2
                      size={20}
                      className={`cursor-pointer ${disableActions ? "opacity-40 pointer-events-none text-gray-400" : "text-rose-600 hover:text-rose-700"}`}
                      title="Delete post"
                      aria-label="Delete post"
                      onClick={() => !disableActions && deletePost(post)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}