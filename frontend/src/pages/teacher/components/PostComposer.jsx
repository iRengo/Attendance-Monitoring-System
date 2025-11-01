import React from "react";
import { Paperclip, Image as ImageIcon, Send } from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";

/**
 * PostComposer keeps upload logic here so UI can remain identical.
 * It posts to backend and calls onPostAdded with returned post.
 * Alerts/validations use SweetAlert2.
 */
export default function PostComposer({ teacherId, selectedClass, onPostAdded }) {
  const [newPost, setNewPost] = React.useState({ text: "", file: null, image: null });

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_upload");
    formData.append("folder", "post_uploads");

    const res = await fetch(`https://api.cloudinary.com/v1_1/dcw2zlfca/auto/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");

    return data.secure_url;
  };

  const handlePostSubmit = async () => {
    if (!newPost.text && !newPost.file && !newPost.image) {
      await Swal.fire({ icon: "warning", title: "Empty post", text: "Please write something or attach a file/image." });
      return;
    }

    try {
      let imageUrl = null;
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (newPost.image) {
        const uploadedImageUrl = await uploadToCloudinary(newPost.image);
        imageUrl = uploadedImageUrl;
        fileName = newPost.image.name;
        fileType = newPost.image.type;
      }

      if (newPost.file) {
        const uploadedFileUrl = await uploadToCloudinary(newPost.file);
        fileUrl = uploadedFileUrl;
        fileName = newPost.file.name;
        fileType = newPost.file.type;
      }

      const payload = {
        teacherId,
        classId: selectedClass.id,
        content: newPost.text,
        fileUrl,
        imageUrl,
        fileName,
        fileType,
      };

      const res = await axios.post("http://localhost:3000/teacher/add-post", payload);

      if (res.data.success) {
        onPostAdded(res.data.post);
        setNewPost({ text: "", file: null, image: null });
        await Swal.fire({ icon: "success", title: "Posted", text: "Your post has been published.", timer: 1200, showConfirmButton: false });
      } else {
        await Swal.fire({ icon: "error", title: "Failed", text: res.data.message || "Failed to post." });
      }
    } catch (err) {
      console.error("Error posting:", err);
      await Swal.fire({ icon: "error", title: "Failed", text: "Failed to post." });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      <textarea
        rows="3"
        placeholder="Write something for your class..."
        value={newPost.text}
        onChange={(e) => setNewPost({ ...newPost, text: e.target.value })}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:ring-2 focus:ring-[#3498db] outline-none resize-none"
      ></textarea>

      <div className="flex justify-between items-center mt-3">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-[#3498db]">
            <ImageIcon size={18} />
            <span className="text-sm">Add Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setNewPost({ ...newPost, image: file });
              }}
              className="hidden"
            />
          </label>

          <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-[#3498db]">
            <Paperclip size={18} />
            <span className="text-sm">Attach File</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setNewPost({ ...newPost, file });
              }}
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