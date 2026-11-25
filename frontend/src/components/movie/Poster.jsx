import { useState } from "react";
import { Film } from "lucide-react";
import "./movie.css";

export default function Poster({ src, title, className = "", eager = false }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`poster poster--placeholder ${className}`} role="img" aria-label={title}>
        <Film size={32} />
        <span>{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      className={`poster ${className}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
}
