import { useState, useEffect, useCallback } from "react";
import axios from "axios";

/**
 * usePosts hook encapsulates fetching posts and exposing an addPost function.
 * The Cloudinary upload logic is kept inside addPost so PostComposer can call it
 * or you can call addPostToState with the created post (we expose addPostToState).
 */
export default function usePosts(teacherId, selectedClass) {
  const [posts, setPosts] = useState([]);

  const fetchPosts = useCallback(async () => {
    if (!selectedClass || !teacherId) return;
    try {
      const res = await axios.get(`/api/teacher/class-posts`, {
        params: { teacherId, classId: selectedClass.id },
      });
      if (res.data.success) setPosts(res.data.posts);
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  }, [selectedClass, teacherId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const addPostToState = (post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const refreshPosts = () => {
    fetchPosts();
  };

  return { posts, setPosts, addPostToState, refreshPosts };
}