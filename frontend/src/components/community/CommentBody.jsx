import "./CommentBody.css";

function isGifUrl(url) {
  return /\.gif(\?|$)/i.test(url) || /giphy\.com|tenor\.com/i.test(url);
}

export default function CommentBody({ body, mediaUrls = [], className = "" }) {
  const text = body?.trim() ?? "";
  const media = mediaUrls.filter(Boolean);

  if (!text && media.length === 0) return null;

  return (
    <div className={`comment-body ${className}`.trim()}>
      {text ? <p className="comment-body__text">{text}</p> : null}
      {media.length > 0 && (
        <ul className={`comment-body__media${media.length === 1 ? " comment-body__media--single" : ""}`}>
          {media.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="comment-body__media-link">
                <img
                  src={url}
                  alt=""
                  className="comment-body__img"
                  loading="lazy"
                  decoding="async"
                  data-gif={isGifUrl(url) ? "true" : undefined}
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
