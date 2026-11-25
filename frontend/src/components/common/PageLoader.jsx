import "./common.css";

export default function PageLoader({ label = "Loading…" }) {
  return (
    <div className="page-loader" role="status">
      <span className="page-loader__reel" aria-hidden="true" />
      <span className="page-loader__label">{label}</span>
    </div>
  );
}
