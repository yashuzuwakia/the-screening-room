import { useRouteError } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";

export default function RouteError() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="container page">
      <EmptyState
        icon={CircleAlert}
        tone="error"
        title="Something went wrong"
        description="An unexpected error occurred while loading this page."
      >
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
        <a href="/" className="btn btn--secondary">
          Back to home
        </a>
      </EmptyState>
    </div>
  );
}
