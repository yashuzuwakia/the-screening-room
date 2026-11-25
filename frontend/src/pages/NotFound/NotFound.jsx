import { Link } from "react-router-dom";
import { Clapperboard } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState
        icon={Clapperboard}
        title="This scene was cut"
        description="The page you're looking for doesn't exist or has moved."
      >
        <Link to="/" className="btn btn--primary">
          Back to home
        </Link>
        <Link to="/discover" className="btn btn--secondary">
          Browse movies
        </Link>
      </EmptyState>
    </div>
  );
}
