import { NavLink } from "react-router-dom";
import { MAIN_NAV } from "../../constants/navigation";
import { useWatchlist } from "../../hooks/useWatchlist";
import { useProfile } from "../../hooks/useProfile";

const linkClass = ({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`;

export default function BottomNav() {
  const { items } = useWatchlist();
  const { isSignedIn } = useProfile();

  return (
    <nav className="bottom-nav" aria-label="Mobile primary">
      {MAIN_NAV.map(({ to, label, Icon, end, badge, requiresSignIn }) => {
        const destination = requiresSignIn && !isSignedIn ? "/login" : to;
        return (
          <NavLink key={to} to={destination} end={end} className={linkClass} title={label}>
            <span className="bottom-nav__icon-wrap">
              <Icon size={22} strokeWidth={2} aria-hidden />
              {badge === "watchlist" && items.length > 0 && (
                <span className="bottom-nav__badge">{items.length > 9 ? "9+" : items.length}</span>
              )}
            </span>
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
