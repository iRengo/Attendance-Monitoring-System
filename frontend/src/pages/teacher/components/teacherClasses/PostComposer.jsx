import React from "react";
import { Paperclip, Image as ImageIcon, Send, X } from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";

export default function PostComposer({ teacherId, selectedClass, onPostAdded }) {
  const [newPost, setNewPost] = React.useState({
    text: "",
    images: [],   // File[]
    files: [],    // File[] (pdf/docx/etc.)
  });

  // For previewing images before upload
  const [imagePreviews, setImagePreviews] = React.useState([]); // {name, url}

  const CLOUD_NAME = "dcw2zlfca";
  const IMAGE_UPLOAD_PRESET = "unsigned_upload";   // must allow images & pdf
  const RAW_UPLOAD_PRESET = "unsigned_upload_raw"; // for docx/pptx if needed

  React.useEffect(() => {
    // build object URLs for selected images
    const urls = newPost.images.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    setImagePreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u.url));
    };
  }, [newPost.images]);

  const uploadToCloudinary = async (file) => {
    if (!file) throw new Error("No file selected.");
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    // IMPORTANT: Upload PDFs via image endpoint to allow pg_1 thumbnail
    const resourceType = (isImage || isPdf) ? "image" : "raw";
    const preset = (isImage || isPdf) ? IMAGE_UPLOAD_PRESET : RAW_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("folder", "post_uploads");

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    const res = await fetch(endpoint, { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Upload failed");
    }

    // Build a thumbnail for PDFs (first page) and a small thumb for images
    let previewThumbUrl = null;
    try {
      const u = new URL(data.secure_url);
      if (isPdf) {
        // /image/upload/pg_1,w_140,h_140,c_fill,f_auto,q_auto/v<ver>/...
        u.pathname = u.pathname.replace(
          /\/image\/upload\/v(\d+)\//,
          (m, ver) => `/image/upload/pg_1,w_140,h_140,c_fill,f_auto,q_auto/v${ver}/`
        );
        previewThumbUrl = u.toString();
      } else if (isImage) {
        // Small square crop for image thumbnails
        u.pathname = u.pathname.replace(
          /\/image\/upload\/v(\d+)\//,
          (m, ver) => `/image/upload/w_140,h_140,c_fill,f_auto,q_auto/v${ver}/`
        );
        previewThumbUrl = u.toString();
      }
    } catch {
      previewThumbUrl = null;
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      resourceType: data.resource_type,
      format: data.format,
      bytes: data.bytes,
      previewThumbUrl,
      originalName: file.name,
      originalType: file.type,
      isImage,
      isPdf,
    };
  };

  const handlePostSubmit = async () => {
    const totalAttachments = newPost.images.length + newPost.files.length;
    if (!newPost.text && totalAttachments === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Empty post",
        text: "Please write something or attach files/images.",
      });
      return;
    }
    if (!teacherId || !selectedClass?.id) {
      await Swal.fire({
        icon: "error",
        title: "Missing info",
        text: "Missing teacher or class information.",
      });
      return;
    }

    try {
      // Upload all attachments in parallel
      const uploads = await Promise.all([
        ...newPost.images.map((f) => uploadToCloudinary(f)),
        ...newPost.files.map((f) => uploadToCloudinary(f)),
      ]);

      // Build attachments array
      const attachments = uploads.map((u) => ({
        url: u.url,
        name: u.originalName,
        type: u.originalType,
        kind: u.isImage ? "image" : "file",
        previewThumbUrl: u.previewThumbUrl || null,
      }));

      // Maintain backward compatibility fields (optional)
      const firstImage = attachments.find((a) => a.kind === "image");
      const firstFile = attachments.find((a) => a.kind !== "image");

      const payload = {
        teacherId,
        classId: selectedClass.id,
        content: newPost.text,
        // legacy single fields for old readers/emails
        imageUrl: firstImage?.url || null,
        fileUrl: firstFile?.url || null,
        fileName: firstFile?.name || null,
        fileType: firstFile?.type || null,
        previewThumbUrl: firstFile?.previewThumbUrl || null,
        // NEW multi-attachment field
        attachments,
      };

      const res = await axios.post(`/api/teacher/add-post`, payload);

      if (res.data.success) {
        onPostAdded(res.data.post);
        setNewPost({ text: "", images: [], files: [] });
        await Swal.fire({
          icon: "success",
          title: "Posted",
          text: "Your post has been published.",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Failed",
          text: res.data.message || "Failed to post.",
        });
      }
    } catch (err) {
      console.error("Error posting:", err);
      await Swal.fire({
        icon: "error",
        title: "Failed",
        text: err.message || "Failed to post.",
      });
    }
  };

  const onAddImages = (files) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setNewPost((p) => ({ ...p, images: [...p.images, ...list] }));
  };
  const onAddFiles = (files) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setNewPost((p) => ({ ...p, files: [...p.files, ...list] }));
  };

  const removeImageAt = (idx) => {
    setNewPost((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
  };
  const removeFileAt = (idx) => {
    setNewPost((p) => ({ ...p, files: p.files.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      <textarea
        rows="3"
        placeholder="Write something for your class..."
        value={newPost.text}
        onChange={(e) => setNewPost((p) => ({ ...p, text: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:ring-2 focus:ring-[#3498db] outline-none resize-none"
      />

      {/* Attachments preview BEFORE posting */}
      {(newPost.images.length > 0 || newPost.files.length > 0) && (
        <div className="mt-3">
          {/* Images grid */}
          {newPost.images.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 mb-1">Images</p>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-24 h-24 object-cover rounded border"
                      title={img.name}
                    />
                    <button
                      onClick={() => removeImageAt(i)}
                      className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                    <div className="w-24 truncate text-[10px] text-gray-600 mt-1" title={img.name}>
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Files list (pdf/docx/...) */}
          {newPost.files.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Files</p>
              <ul className="space-y-2">
                {newPost.files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-gray-50 border rounded px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800 truncate" title={f.name}>
                        {f.name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {(f.type || "file")} • {(f.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={() => removeFileAt(i)}
                      className="text-gray-600 hover:text-red-600"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-3">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-[#3498db]">
            <ImageIcon size={18} />
            <span className="text-sm">Add Image(s)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onAddImages(e.target.files)}
              className="hidden"
            />
          </label>

          <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-[#3498db]">
            <Paperclip size={18} />
            <span className="text-sm">Attach File(s)</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              multiple
              onChange={(e) => onAddFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handlePostSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium hover:bg-[#2f89ca] transition"
        >
          <Send size={16} /> Post
        </button>
      </div>
    </div>
  );
}