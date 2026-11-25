import { Link } from "react-router-dom";
import { Popcorn } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <span className="navbar__logo">
            <Popcorn size={16} strokeWidth={2.4} />
          </span>
          <div>
            <p className="footer__name">The Screening Room</p>
            <p className="footer__tagline">Less scrolling. More watching.</p>
          </div>
        </div>

        <nav className="footer__links" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/discover">Discover</Link>
          <Link to="/watchlist">Watchlist</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/find">Find a movie</Link>
        </nav>

        <p className="footer__credit">
          Movie data and images from{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
