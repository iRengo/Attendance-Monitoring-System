import React from "react";
import { Paperclip } from "lucide-react";

export default function PostsList({ posts, setPreview }) {
  return (
    <>
      {posts.length === 0 ? (
        <p className="text-gray-400 text-center">No posts yet.</p>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-gray-800 mb-2">{post.content}</p>
            {post.imageUrl && (
              <div
                className="mt-3 cursor-pointer"
                onClick={() => setPreview(post.imageUrl)}
              >
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="rounded-lg max-h-64 object-cover border"
                />
              </div>
            )}

            {post.fileUrl && (
              <div
                className="mt-3 flex items-center gap-2 p-3 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  const previewUrl = post.fileUrl.endsWith(".pdf")
                    ? post.fileUrl.replace("/upload/", "/upload/fl_inline/")
                    : post.fileUrl;

                  setPreview(previewUrl);
                }}
              >
                <Paperclip size={18} className="text-gray-600" />
                <span className="text-sm text-gray-800 truncate">{post.fileName}</span>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              {new Date(post.timestamp).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </>
  );
}