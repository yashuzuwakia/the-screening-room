import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles, ThumbsUp, Users, WandSparkles } from "lucide-react";
import MovieGrid from "../../components/movie/MovieGrid";
import NewPostForm from "../../components/community/NewPostForm";
import { useTrendingMovies } from "../../hooks/useMovies";
import { useProfile } from "../../hooks/useProfile";
import { MOODS } from "../../constants/moods";
import MoodIcon from "../../components/common/MoodIcon";
import { fadeInView } from "../../constants/motion";
import { useAsync } from "../../hooks/useAsync";
import { isApiMode } from "../../services/apiClient.js";
import { fetchCommunityFeed } from "../../services/communityApi.js";
import { formatDate } from "../../utils/format";
import "../../components/community/community.css";
import "./Community.css";

const FALLBACK_THREADS = [
  { title: "Best double feature under 4 hours", replyCount: 128, type: "discussion" },
  { title: "Underrated sci-fi from the last 5 years", replyCount: 94, type: "list" },
  { title: "What made you cry (in a good way)?", replyCount: 211, type: "mood" },
];

const typeLabel = (type) =>
  type === "list" ? "List" : type === "mood" ? "Mood" : type === "movie" ? "Movie" : "Discussion";

export default function Community() {
  const { data: trending, isLoading } = useTrendingMovies();
  const { name, isSignedIn } = useProfile();
  const [feedTick, setFeedTick] = useState(0);

  const loadFeed = useCallback(
    () => (isApiMode() ? fetchCommunityFeed({ take: 12 }) : Promise.resolve(null)),
    [],
  );
  const { data: feed, isLoading: feedLoading } = useAsync(loadFeed, feedTick);

  const threads = feed?.items?.length ? feed.items : FALLBACK_THREADS;
  const usingLiveFeed = Boolean(feed?.items?.length);
  const canPost = isApiMode() && isSignedIn;

  return (
    <div className="community">
      <section className="community__hero">
        <div className="container community__hero-inner">
          <motion.div {...fadeInView()}>
            <span className="eyebrow">
              <Users size={14} /> Community
            </span>
            <h1 className="community__title">See what everyone&apos;s watching tonight</h1>
            <p className="community__lead">
              Start threads, reply to picks, and like ideas from other watchers. Posts save to your account when the API
              is running.
            </p>
            {isSignedIn && (
              <p className="community__welcome">
                Welcome back, <strong>{name}</strong>.
              </p>
            )}
            <div className="community__hero-actions">
              <Link to="/find" className="btn btn--primary btn--lg">
                <WandSparkles size={18} /> Get your match
              </Link>
              {!isSignedIn && isApiMode() && (
                <Link to="/login" className="btn btn--secondary btn--lg">
                  Sign in to post
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container community__body">
        <section className="community__section">
          <div className="community__section-head">
            <h2 className="section-title">Trending with watchers</h2>
            <p className="text-muted">Popular in your country right now</p>
          </div>
          <MovieGrid movies={trending?.slice(0, 8)} isLoading={isLoading} skeletonCount={8} />
          <Link to="/discover" className="btn btn--ghost community__more">
            Browse all <ArrowRight size={16} />
          </Link>
        </section>

        <div className="community__split">
          <section className="community__panel">
            <h2 className="community__panel-title">
              <MessageCircle size={22} /> Hot threads
            </h2>
            {canPost && <NewPostForm onCreated={() => setFeedTick((v) => v + 1)} />}
            {!isApiMode() && (
              <p className="community__coming text-muted">Start the API to read and write live threads.</p>
            )}
            {isApiMode() && !isSignedIn && (
              <p className="community__coming text-muted">
                <Link to="/login">Sign in</Link> to start a thread.
              </p>
            )}
            <ul className="thread-list">
              {threads.map((thread, index) => {
                const content = (
                  <>
                    <span className="chip chip--neutral">{typeLabel(thread.type ?? "discussion")}</span>
                    <p className="thread-card__title">{thread.title}</p>
                    {thread.body && <p className="thread-card__excerpt">{thread.body}</p>}
                    <span className="thread-card__meta">
                      {usingLiveFeed && thread.author && `${thread.author} · `}
                      {thread.createdAt && `${formatDate(thread.createdAt)} · `}
                      {thread.replyCount ?? thread.replies ?? 0} replies
                      {thread.likeCount != null ? ` · ${thread.likeCount} likes` : ""}
                    </span>
                    {thread.movie && (
                      <span className="thread-card__movie">
                        {thread.movie.posterUrl && <img src={thread.movie.posterUrl} alt="" />}
                        {thread.movie.title}
                      </span>
                    )}
                  </>
                );

                return (
                  <motion.li
                    key={thread.id ?? thread.title}
                    className="thread-card"
                    {...fadeInView(index * 0.08)}
                  >
                    {thread.id ? (
                      <Link to={`/community/${thread.id}`} className="thread-card__link">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </motion.li>
                );
              })}
            </ul>
            {feedLoading && <p className="community__coming text-muted">Loading community feed…</p>}
            {!usingLiveFeed && !feedLoading && isApiMode() && (
              <p className="community__coming text-muted">No posts yet — be the first to start a thread.</p>
            )}
          </section>

          <section className="community__panel">
            <h2 className="community__panel-title">
              <ThumbsUp size={22} /> Start with a mood
            </h2>
            <p className="text-muted community__panel-desc">Jump into the wizard with a vibe others are picking tonight.</p>
            <ul className="mood-vote-list">
              {MOODS.map((mood, index) => (
                <motion.li key={mood.id} {...fadeInView(index * 0.05)}>
                  <Link to={`/find?mood=${mood.id}`} className="mood-vote">
                    <MoodIcon moodId={mood.id} size={18} className="mood-vote__glyph" />
                    <span>{mood.label}</span>
                    <Sparkles size={16} className="mood-vote__icon" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
