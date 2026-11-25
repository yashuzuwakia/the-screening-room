import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Fingerprint,
  History,
  LayoutList,
  LogOut,
  Pencil,
  Search,
  Star,
  Trash2,
  User,
} from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import ProfileEditPanel from "../../components/profile/ProfileEditPanel";
import HiddenFromFindSection from "../../components/profile/HiddenFromFindSection";
import { useProfile } from "../../hooks/useProfile";
import { resolveApiMediaUrl } from "../../utils/mediaUrl";
import { useWatchlist } from "../../hooks/useWatchlist";
import { getMood } from "../../constants/moods";
import MoodIcon from "../../components/common/MoodIcon";
import { getGenreName, getGenreNames } from "../../constants/genres";
import { getPlatform } from "../../constants/platforms";
import { getRuntimeOption } from "../../constants/runtimes";
import { preferencesToSearch } from "../../utils/preferences";
import { formatRating } from "../../utils/format";
import "./Profile.css";

function topGenre(movies) {
  const counts = {};
  movies.flatMap((m) => m.genreIds ?? []).forEach((id) => (counts[id] = (counts[id] ?? 0) + 1));
  const [id] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  return id ? getGenreName(Number(id)) : null;
}

function averageRating(movies) {
  const rated = movies.filter((m) => m.rating);
  return rated.length ? rated.reduce((sum, m) => sum + m.rating, 0) / rated.length : null;
}

const describeSearch = (prefs) =>
  [
    ...getGenreNames(prefs.genres),
    ...prefs.platforms.map((id) => getPlatform(id)?.name),
    getRuntimeOption(prefs.runtime)?.label,
  ]
    .filter(Boolean)
    .join(" · ");

function formatMemberSince(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function roleLabel(role) {
  if (role === "admin") return "Administrator";
  return "Member";
}

export default function Profile() {
  const {
    name,
    email,
    avatarUrl,
    userId,
    createdAt,
    role,
    useApi,
    isSignedIn,
    isAdmin,
    recentSearches,
    signOut,
    clearHistory,
    watchRegion,
    watchRegionMeta,
  } = useProfile();
  const { items } = useWatchlist();
  const [editing, setEditing] = useState(false);
  const avatarSrc = resolveApiMediaUrl(avatarUrl);

  if (!isSignedIn) return <Navigate to="/login" replace />;

  const stats = [
    { label: "In watchlist", value: items.length },
    { label: "Favorite genre", value: topGenre(items) ?? "—" },
    { label: "Avg. rating saved", value: formatRating(averageRating(items)) },
    { label: "Searches", value: recentSearches.length },
  ];

  return (
    <div className="container page profile">
      <header className="profile__header">
        <span className={`profile__avatar${avatarSrc ? " profile__avatar--image" : ""}`}>
          {avatarSrc ? <img src={avatarSrc} alt="" /> : name.charAt(0).toUpperCase()}
        </span>
        <div className="profile__identity">
          <span className="eyebrow">Profile</span>
          <h1 className="profile__name">Hi, {name}</h1>
        </div>
        <div className="profile__header-actions">
          <button type="button" className="btn btn--secondary" onClick={() => setEditing((v) => !v)}>
            <Pencil size={16} /> {editing ? "Done" : "Edit profile"}
          </button>
          <button type="button" className="btn btn--secondary" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      {editing && <ProfileEditPanel onClose={() => setEditing(false)} />}

      <section className="profile__section profile__section--account" aria-labelledby="profile-account-heading">
        <h2 id="profile-account-heading" className="profile__section-title">
          <User size={20} /> Your account
        </h2>
        <dl className="profile__account-grid">
          <div className="profile__account-row">
            <dt>Display name</dt>
            <dd>{name || "—"}</dd>
          </div>
          <div className="profile__account-row">
            <dt>Email</dt>
            <dd>{email?.trim() ? email : useApi ? "—" : "Local session (no email)"}</dd>
          </div>
          {userId && (
            <div className="profile__account-row">
              <dt>User ID</dt>
              <dd className="profile__account-mono" title={userId}>
                <Fingerprint size={14} aria-hidden />
                {userId}
              </dd>
            </div>
          )}
          <div className="profile__account-row">
            <dt>Role</dt>
            <dd>
              <span className={`profile__role-pill${isAdmin ? " is-admin" : ""}`}>{roleLabel(role)}</span>
            </dd>
          </div>
          <div className="profile__account-row">
            <dt>Watch country</dt>
            <dd>
              {watchRegionMeta.label} {watchRegionMeta.flag}{" "}
              <span className="profile__account-code text-muted">({watchRegion})</span>
            </dd>
          </div>
          {formatMemberSince(createdAt) && (
            <div className="profile__account-row">
              <dt>Member since</dt>
              <dd>{formatMemberSince(createdAt)}</dd>
            </div>
          )}
        </dl>
        <p className="profile__account-note text-muted">
          Watch country affects Discover and where to watch links. Edit it in <strong>Edit profile</strong>.
        </p>
      </section>

      {isAdmin && (
        <section className="profile__admin" aria-labelledby="profile-admin-heading">
          <div className="profile__admin-icon" aria-hidden="true">
            <LayoutList size={22} strokeWidth={2} />
          </div>
          <div className="profile__admin-body">
            <span className="eyebrow">Admin</span>
            <h2 id="profile-admin-heading" className="profile__admin-title">
              Discover curation
            </h2>
            <p className="profile__admin-desc text-muted">
              Drag to reorder on Discover, or search TMDB to hide titles from a country or genre tab.
            </p>
            <div className="profile__admin-actions">
              <Link to="/discover" className="btn btn--secondary btn--sm">
                <LayoutList size={15} /> Open Discover
              </Link>
              <Link to="/admin/discover" className="btn btn--primary btn--sm">
                <Search size={15} /> Search &amp; hide titles
              </Link>
            </div>
          </div>
        </section>
      )}

      <ul className="profile__stats">
        {stats.map((stat) => (
          <li key={stat.label} className="profile__stat">
            <span className="profile__stat-value">{stat.value}</span>
            <span className="profile__stat-label">{stat.label}</span>
          </li>
        ))}
      </ul>

      <section className="profile__section">
        <div className="profile__section-head">
          <h2 className="profile__section-title">
            <History size={20} /> Recent searches
          </h2>
          {recentSearches.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearHistory}>
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>

        {recentSearches.length ? (
          <ul className="search-history">
            {recentSearches.map(({ prefs, searchedAt }) => {
              const mood = getMood(prefs.mood);
              return (
                <li key={searchedAt}>
                  <Link to={`/results${preferencesToSearch(prefs)}`} className="search-history__item">
                    <span className="search-history__glyph" aria-hidden="true">
                      <MoodIcon moodId={prefs.mood} size={20} />
                    </span>
                    <span className="search-history__text">
                      <strong>{mood?.label}</strong>
                      <span>{describeSearch(prefs)}</span>
                    </span>
                    <ArrowRight size={18} className="search-history__arrow" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={History} title="No searches yet" description="Your recent matches will show up here.">
            <Link to="/find" className="btn btn--primary">
              Find a movie
            </Link>
          </EmptyState>
        )}
      </section>

      {items.length > 0 && (
        <section className="profile__section">
          <div className="profile__section-head">
            <h2 className="profile__section-title">
              <Bookmark size={20} /> Recently saved
            </h2>
            <Link to="/watchlist" className="btn btn--ghost btn--sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="saved-strip">
            {items.slice(0, 6).map((movie) => (
              <li key={movie.id}>
                <Link to={`/movie/${movie.id}`} className="saved-strip__item">
                  {movie.posterUrl && <img src={movie.posterUrl} alt="" loading="lazy" />}
                  <span className="saved-strip__title">{movie.title}</span>
                  {movie.rating && (
                    <span className="saved-strip__rating">
                      <Star size={12} fill="currentColor" /> {formatRating(movie.rating)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HiddenFromFindSection />
    </div>
  );
}
