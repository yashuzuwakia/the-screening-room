import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import PageLoader from "../components/common/PageLoader";
import Home from "../pages/Home/Home";
import RouteError from "../pages/RouteError/RouteError";

// Code-split every page except the landing page; the router loads each chunk before navigating.
const page = (load) => async () => ({ Component: (await load()).default });

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/discover", lazy: page(() => import("../pages/Discover/Discover")) },
      { path: "/search", lazy: page(() => import("../pages/Search/Search")) },
      { path: "/find", lazy: page(() => import("../pages/RecommendationFlow/RecommendationFlow")) },
      { path: "/results", lazy: page(() => import("../pages/ResultsPage/ResultsPage")) },
      { path: "/recommendations", element: <Navigate to="/results" replace /> },
      { path: "/movie/:id", lazy: page(() => import("../pages/MovieDetails/MovieDetails")) },
      { path: "/watchlist", lazy: page(() => import("../pages/Watchlist/Watchlist")) },
      { path: "/community", lazy: page(() => import("../pages/Community/Community")) },
      { path: "/community/:postId", lazy: page(() => import("../pages/Community/CommunityThread")) },
      { path: "/profile", lazy: page(() => import("../pages/Profile/Profile")) },
      { path: "/login", lazy: page(() => import("../pages/Login/Login")) },
      { path: "/forgot-password", lazy: page(() => import("../pages/ForgotPassword/ForgotPassword")) },
      { path: "/reset-password", lazy: page(() => import("../pages/ResetPassword/ResetPassword")) },
      { path: "/admin/discover", lazy: page(() => import("../pages/AdminDiscover/AdminDiscover")) },
      { path: "*", lazy: page(() => import("../pages/NotFound/NotFound")) },
    ],
  },
]);
