import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Popcorn, Search, WandSparkles } from "lucide-react";
import { MAIN_NAV } from "../../constants/navigation";
import { useWatchlist } from "../../hooks/useWatchlist";
import { useProfile } from "../../hooks/useProfile";
import MovieSearchBar from "../common/MovieSearchBar";

const navClass = ({ isActive }) => `navbar__link${isActive ? " is-active" : ""}`;

export default function Navbar() {
  const { items } = useWatchlist();
  const { isSignedIn } = useProfile();
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 8);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar${isScrolled ? " is-scrolled" : ""}`}>
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="The Screening Room home">
          <span className="navbar__logo">
            <Popcorn size={18} strokeWidth={2.4} />
          </span>
          <span className="navbar__wordmark">
            The Screening <span>Room</span>
          </span>
        </Link>

        <nav className="navbar__links navbar__links--desktop" aria-label="Main">
          {MAIN_NAV.map(({ to, label, Icon, end, badge, requiresSignIn }) => {
            const destination = requiresSignIn && !isSignedIn ? "/login" : to;
            return (
              <NavLink key={to} to={destination} end={end} className={navClass} title={label}>
                <Icon size={18} aria-hidden />
                <span>{label}</span>
                {badge === "watchlist" && items.length > 0 && (
                  <span className="navbar__badge">{items.length}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="navbar__search navbar__search--desktop">
          <MovieSearchBar id="navbar-search" placeholder="Search movies…" showSuggestions />
        </div>

        <Link to="/search" className="navbar__search-btn" aria-label="Search movies">
          <Search size={20} aria-hidden />
        </Link>

        <div className="navbar__actions">
          <Link to="/find" className="btn btn--primary btn--sm navbar__cta">
            <WandSparkles size={16} aria-hidden />
            <span className="navbar__cta-text">Find my movie</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
