import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Heart, MessageCircle, MessagesSquare } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useProfile } from "../../hooks/useProfile";
import { isApiMode } from "../../services/apiClient.js";
import {
  createMovieDiscussionComment,
  fetchCommunityPost,
  fetchMovieDiscussion,
  replyToPost,
  togglePostLike,
} from "../../services/communityApi.js";
import { formatDate } from "../../utils/format";
import { canSubmitComment } from "../../utils/communityMedia.js";
import CommentBody from "../community/CommentBody";
import CommentComposer from "../community/CommentComposer";
import "../community/community.css";
import "./MovieDiscussion.css";

function DiscussionThread({ post, isSignedIn }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyMedia, setReplyMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [threadTick, setThreadTick] = useState(0);

  const loadThread = useCallback(
    () => (open ? fetchCommunityPost(post.id) : Promise.resolve(null)),
    [open, post.id],
  );
  const { data, isLoading } = useAsync(loadThread, threadTick);

  const liked = Boolean(data?.likedByViewer);
  const likeCount = data?.post?.likeCount ?? post.likeCount;
  const replyCount = data?.replies?.length ?? post.replyCount;
  const visibleReplies = data?.replies ?? [];

  const handleToggle = () => {
    setOpen((value) => !value);
    setError("");
  };

  const handleLike = async () => {
    if (!isSignedIn || busy) return;
    setBusy(true);
    try {
      await togglePostLike(post.id);
      setThreadTick((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    if (!isSignedIn || busy || !canSubmitComment({ text: replyText, mediaUrls: replyMedia })) return;
    setBusy(true);
    setError("");
    try {
      await replyToPost(post.id, { body: replyText.trim(), mediaUrls: replyMedia });
      setReplyText("");
      setReplyMedia([]);
      setThreadTick((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="movie-discussion__item">
      <div className="movie-discussion__head">
        <p className="movie-discussion__meta">
          <strong>{post.author}</strong> · {formatDate(post.createdAt)}
        </p>
        <Link to={`/community/${post.id}`} className="movie-discussion__thread-link text-muted">
          Open thread
        </Link>
      </div>
      <CommentBody body={post.body} mediaUrls={post.mediaUrls} className="movie-discussion__body" />
      <div className="movie-discussion__actions">
        <button
          type="button"
          className={`btn btn--ghost btn--sm${liked ? " is-active" : ""}`}
          onClick={handleLike}
          disabled={!isSignedIn || busy}
          title={isSignedIn ? "Like" : "Sign in to like"}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} /> {likeCount}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleToggle}>
          <MessageCircle size={15} /> {replyCount}
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {open && (
        <div className="movie-discussion__replies">
          {isLoading && !visibleReplies.length && <p className="text-muted">Loading replies…</p>}
          {visibleReplies.length > 0 && (
            <ul className="reply-list">
              {visibleReplies.map((reply) => (
                <li key={reply.id} className="reply-card">
                  <p className="reply-card__meta">
                    <strong>{reply.author}</strong> · {formatDate(reply.createdAt)}
                  </p>
                  <CommentBody body={reply.body} mediaUrls={reply.mediaUrls} className="reply-card__body" />
                </li>
              ))}
            </ul>
          )}
          {!isLoading && visibleReplies.length === 0 && <p className="text-muted">No replies yet.</p>}

          {isSignedIn ? (
            <form className="movie-discussion__reply-form" onSubmit={handleReply}>
              <CommentComposer
                text={replyText}
                mediaUrls={replyMedia}
                onTextChange={setReplyText}
                onMediaUrlsChange={setReplyMedia}
                rows={2}
                placeholder="Reply to this thread…"
                disabled={busy}
              />
              {error && <p className="community-new-post__error">{error}</p>}
              <button
                type="submit"
                className="btn btn--secondary btn--sm"
                disabled={busy || !canSubmitComment({ text: replyText, mediaUrls: replyMedia })}
              >
                Reply
              </button>
            </form>
          ) : (
            <p className="text-muted">
              <Link to="/login">Sign in</Link> to reply.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function MovieDiscussion({ movieId, movieTitle }) {
  const { isSignedIn } = useProfile();
  const [reloadTick, setReloadTick] = useState(0);
  const [comment, setComment] = useState("");
  const [commentMedia, setCommentMedia] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      isApiMode() && movieId
        ? fetchMovieDiscussion(movieId, { take: 15 })
        : Promise.resolve({ items: [], nextCursor: null }),
    [movieId],
  );
  const { data, isLoading } = useAsync(load, reloadTick);

  if (!isApiMode()) return null;

  const posts = data?.items ?? [];

  const handlePost = async (event) => {
    event.preventDefault();
    if (!isSignedIn || busy || !canSubmitComment({ text: comment, mediaUrls: commentMedia })) return;
    setBusy(true);
    setError("");
    try {
      await createMovieDiscussionComment(movieId, { body: comment.trim(), mediaUrls: commentMedia });
      setComment("");
      setCommentMedia([]);
      setReloadTick((value) => value + 1);
    } catch (err) {
      setError(err.message ?? "Could not post comment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="movie-discussion" aria-labelledby="movie-discussion-title">
      <div className="movie-discussion__header">
        <h2 id="movie-discussion-title" className="section-title">
          <MessagesSquare size={22} aria-hidden="true" /> Discussion
        </h2>
        <p className="text-muted">Share thoughts, hot takes, and questions about {movieTitle}.</p>
      </div>

      {isSignedIn ? (
        <form className="movie-discussion__compose" onSubmit={handlePost}>
          <label className="community-new-post__field">
            <span className="text-muted">Your comment</span>
            <CommentComposer
              text={comment}
              mediaUrls={commentMedia}
              onTextChange={setComment}
              onMediaUrlsChange={setCommentMedia}
              rows={3}
              placeholder="What did you think? Add a photo if you like…"
              disabled={busy}
            />
          </label>
          {error && <p className="community-new-post__error">{error}</p>}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || !canSubmitComment({ text: comment, mediaUrls: commentMedia })}
          >
            {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="movie-discussion__signin text-muted">
          <Link to="/login">Sign in</Link> to join the discussion.
        </p>
      )}

      {isLoading && posts.length === 0 && <p className="text-muted">Loading discussion…</p>}

      {!isLoading && posts.length === 0 && (
        <p className="text-muted movie-discussion__empty">No comments yet — start the conversation.</p>
      )}

      {posts.length > 0 && (
        <ul className="movie-discussion__list">
          {posts.map((post) => (
            <DiscussionThread key={post.id} post={post} isSignedIn={isSignedIn} />
          ))}
        </ul>
      )}
    </section>
  );
}
