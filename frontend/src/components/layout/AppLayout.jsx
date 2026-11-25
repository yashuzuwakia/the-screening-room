import { Outlet, ScrollRestoration, useLocation, useNavigation } from "react-router-dom";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import ApiStatusBanner from "./ApiStatusBanner";
import "./layout.css";

const ROUTES_WITHOUT_FOOTER = ["/find"];

export default function AppLayout() {
  const { pathname } = useLocation();
  const isNavigating = useNavigation().state === "loading";

  return (
    <div className="app-shell has-bottom-nav">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {isNavigating && <div className="route-progress" role="progressbar" aria-label="Loading page" />}
      <ApiStatusBanner />
      <Navbar />
      <main id="main" className="app-main">
        <Outlet />
      </main>
      {!ROUTES_WITHOUT_FOOTER.includes(pathname) && <Footer />}
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
