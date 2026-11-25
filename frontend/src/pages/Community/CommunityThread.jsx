import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Trash2 } from "lucide-react";
import PageLoader from "../../components/common/PageLoader";
import EmptyState from "../../components/common/EmptyState";
import CommentBody from "../../components/community/CommentBody";
import CommentComposer from "../../components/community/CommentComposer";
import { useAsync } from "../../hooks/useAsync";
import { useProfile } from "../../hooks/useProfile";
import {
  deleteCommunityPost,
  fetchCommunityPost,
  replyToPost,
  togglePostLike,
} from "../../services/communityApi.js";
import { isApiMode } from "../../services/apiClient.js";
import { formatDate } from "../../utils/format";
import { canSubmitComment } from "../../utils/communityMedia.js";
import "../../components/community/community.css";
import "./Community.css";
import "./CommunityThread.css";

const typeLabel = (type) =>
  type === "list" ? "List" : type === "mood" ? "Mood" : type === "movie" ? "Movie" : "Discussion";

export default function CommunityThread() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { isSignedIn } = useProfile();
  const [replyText, setReplyText] = useState("");
  const [replyMedia, setReplyMedia] = useState([]);
  const [replyError, setReplyError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const load = useCallback(
    () => (postId ? fetchCommunityPost(postId) : Promise.resolve(null)),
    [postId],
  );
  const { data, isLoading, error } = useAsync(load, reloadTick);

  if (!isApiMode()) {
    return (
      <div className="container page">
        <EmptyState title="Community needs the API" description="Turn on VITE_USE_API and start the backend to view threads.">
          <Link to="/community" className="btn btn--secondary">
            Back
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (isLoading && !data) return <PageLoader />;

  if (error || !data?.post) {
    return (
      <div className="container page">
        <EmptyState tone="error" title="Thread not found" description={error?.message}>
          <Link to="/community" className="btn btn--primary">
            Back to community
          </Link>
        </EmptyState>
      </div>
    );
  }

  const { post, replies = [], likedByViewer: liked } = data;

  const bump = () => setReloadTick((t) => t + 1);

  const handleLike = async () => {
    if (!isSignedIn) return;
    setBusy(true);
    try {
      await togglePostLike(postId);
      bump();
    } finally {
      setBusy(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    if (!isSignedIn || !canSubmitComment({ text: replyText, mediaUrls: replyMedia })) return;
    setReplyError("");
    setBusy(true);
    try {
      await replyToPost(postId, { body: replyText.trim(), mediaUrls: replyMedia });
      setReplyText("");
      setReplyMedia([]);
      bump();
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this thread?")) return;
    setBusy(true);
    try {
      await deleteCommunityPost(postId);
      navigate("/community", { replace: true });
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page community-thread">
      <Link to="/community" className="btn btn--ghost community-thread__back">
        <ArrowLeft size={18} /> Community
      </Link>

      <article className="community-thread__post">
        <span className="chip chip--neutral">{typeLabel(post.type)}</span>
        <h1 className="community-thread__title">{post.title}</h1>
        <p className="community-thread__meta">
          {post.author} · {formatDate(post.createdAt)}
        </p>
        <CommentBody body={post.body} mediaUrls={post.mediaUrls} className="community-thread__body" />
        {post.movie && (
          <Link to={`/movie/${post.movie.tmdbId}`} className="community-thread__movie">
            {post.movie.posterUrl && <img src={post.movie.posterUrl} alt="" />}
            <span>{post.movie.title}</span>
          </Link>
        )}
        <div className="community-thread__actions">
          <button
            type="button"
            className={`btn btn--secondary btn--sm${liked ? " is-active" : ""}`}
            onClick={handleLike}
            disabled={!isSignedIn || busy}
            title={isSignedIn ? "Like this thread" : "Sign in to like"}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} /> {post.likeCount}
          </button>
          <span className="community-thread__stat">
            <MessageCircle size={16} /> {replies.length} replies
          </span>
          {isSignedIn && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleDelete} disabled={busy}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </article>

      <section className="community-thread__replies">
        <h2 className="section-title">Replies</h2>
        {replies.length === 0 && <p className="text-muted">Be the first to reply.</p>}
        <ul className="reply-list">
          {replies.map((reply) => (
            <li key={reply.id} className="reply-card">
              <p className="reply-card__meta">
                <strong>{reply.author}</strong> · {formatDate(reply.createdAt)}
              </p>
              <CommentBody body={reply.body} mediaUrls={reply.mediaUrls} className="reply-card__body" />
            </li>
          ))}
        </ul>
      </section>

      {isSignedIn ? (
        <form className="community-thread__reply-form" onSubmit={handleReply}>
          <label>
            <span className="text-muted">Your reply</span>
            <CommentComposer
              text={replyText}
              mediaUrls={replyMedia}
              onTextChange={setReplyText}
              onMediaUrlsChange={setReplyMedia}
              rows={3}
              disabled={busy}
            />
          </label>
          {replyError && <p className="community-new-post__error">{replyError}</p>}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || !canSubmitComment({ text: replyText, mediaUrls: replyMedia })}
          >
            Reply
          </button>
        </form>
      ) : (
        <p className="text-muted community-thread__signin">
          <Link to="/login">Sign in</Link> to reply or like.
        </p>
      )}
    </div>
  );
}
