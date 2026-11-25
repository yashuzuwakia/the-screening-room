import { apiFetch, getAuthToken } from "./apiClient.js";
import { guessImageMime } from "../utils/imageMime.js";

export function fetchMovieDiscussion(tmdbId, { take = 20, cursor } = {}) {
  const params = new URLSearchParams({ take: String(take) });
  if (cursor) params.set("cursor", cursor);
  return apiFetch(`/community/movies/${tmdbId}/posts?${params}`, { auth: false });
}

export function createMovieDiscussionComment(tmdbId, { body, mediaUrls = [] }) {
  return apiFetch(`/community/movies/${tmdbId}/posts`, { method: "POST", body: { body, mediaUrls } });
}

export function fetchCommunityFeed({ take = 20, cursor } = {}) {
  const params = new URLSearchParams({ take: String(take) });
  if (cursor) params.set("cursor", cursor);
  return apiFetch(`/community/feed?${params}`, { auth: false });
}

export function fetchCommunityPost(postId) {
  return apiFetch(`/community/posts/${postId}`);
}

export function createCommunityPost(body) {
  return apiFetch("/community/posts", { method: "POST", body });
}

export function replyToPost(postId, { body, mediaUrls = [] }) {
  return apiFetch(`/community/posts/${postId}/replies`, { method: "POST", body: { body, mediaUrls } });
}

export function togglePostLike(postId) {
  return apiFetch(`/community/posts/${postId}/like`, { method: "POST" });
}

export function deleteCommunityPost(postId) {
  return apiFetch(`/community/posts/${postId}`, { method: "DELETE" });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadCommunityMedia(file) {
  if (!getAuthToken()) {
    throw new Error("Sign in to upload images");
  }
  const data = await fileToBase64(file);
  return apiFetch("/community/media/upload", {
    method: "POST",
    body: {
      data,
      mimeType: guessImageMime(file),
      name: file.name,
    },
  });
}
