import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { createCommunityPost } from "../../services/communityApi.js";
import { canSubmitComment } from "../../utils/communityMedia.js";
import CommentComposer from "./CommentComposer";
import "./community.css";

const TYPES = [
  { id: "discussion", label: "Discussion" },
  { id: "list", label: "List idea" },
  { id: "mood", label: "Mood chat" },
];

export default function NewPostForm({ onCreated }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [type, setType] = useState("discussion");
  const [movieTmdbId, setMovieTmdbId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setMediaUrls([]);
    setType("discussion");
    setMovieTmdbId("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        mediaUrls,
        type,
        movieTmdbId: movieTmdbId.trim() ? Number(movieTmdbId) : null,
      };
      const { post } = await createCommunityPost(payload);
      reset();
      setOpen(false);
      onCreated?.(post);
      navigate(`/community/${post.id}`);
    } catch (err) {
      setError(err.message ?? "Could not create post");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn--primary community-new-post__toggle" onClick={() => setOpen(true)}>
        <PenLine size={18} /> Start a thread
      </button>
    );
  }

  return (
    <form className="community-new-post" onSubmit={handleSubmit}>
      <h3 className="community-new-post__title">New thread</h3>
      <div className="community-new-post__types">
        {TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip chip--neutral${type === item.id ? " is-selected" : ""}`}
            onClick={() => setType(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="community-new-post__field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
      </label>
      <label className="community-new-post__field">
        <span>What&apos;s on your mind?</span>
        <CommentComposer
          text={body}
          mediaUrls={mediaUrls}
          onTextChange={setBody}
          onMediaUrlsChange={setMediaUrls}
          rows={4}
          maxLength={8000}
          placeholder="Start the conversation…"
          disabled={busy}
        />
      </label>
      <label className="community-new-post__field">
        <span>Link a movie (TMDB id, optional)</span>
        <input
          value={movieTmdbId}
          onChange={(e) => setMovieTmdbId(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 693134"
          inputMode="numeric"
        />
      </label>
      {error && <p className="community-new-post__error">{error}</p>}
      <div className="community-new-post__actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || !canSubmitComment({ text: body, mediaUrls })}
        >
          {busy ? "Posting…" : "Post"}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
