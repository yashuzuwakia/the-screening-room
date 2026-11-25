import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadCommunityMedia } from "../../services/communityApi.js";
import { COMMUNITY_MEDIA_MAX } from "../../utils/communityMedia.js";
import "./CommentComposer.css";

export default function CommentComposer({
  text,
  mediaUrls,
  onTextChange,
  onMediaUrlsChange,
  rows = 3,
  maxLength = 4000,
  placeholder = "Write a comment…",
  disabled = false,
  id,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [toolError, setToolError] = useState("");

  const atMediaLimit = mediaUrls.length >= COMMUNITY_MEDIA_MAX;

  const appendMedia = (url) => {
    if (!url || mediaUrls.includes(url) || mediaUrls.length >= COMMUNITY_MEDIA_MAX) return;
    onMediaUrlsChange([...mediaUrls, url]);
  };

  const removeMedia = (url) => {
    onMediaUrlsChange(mediaUrls.filter((item) => item !== url));
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || atMediaLimit) return;
    setToolError("");
    setUploading(true);
    try {
      const { url } = await uploadCommunityMedia(file);
      appendMedia(url);
    } catch (err) {
      setToolError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="comment-composer">
      <textarea
        id={id}
        className="comment-composer__input"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled || uploading}
      />
      {mediaUrls.length > 0 && (
        <ul className="comment-composer__previews">
          {mediaUrls.map((url) => (
            <li key={url}>
              <img src={url} alt="" />
              <button
                type="button"
                className="comment-composer__remove"
                onClick={() => removeMedia(url)}
                disabled={disabled}
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="comment-composer__toolbar">
        <input
          ref={fileRef}
          type="file"
          accept="image/gif,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleUpload}
        />
        <button
          type="button"
          className="comment-composer__tool"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading || atMediaLimit}
          title="Upload image or GIF file"
        >
          <ImagePlus size={16} /> Photo
        </button>
        <span className="comment-composer__limit text-muted">
          {mediaUrls.length}/{COMMUNITY_MEDIA_MAX} media
        </span>
      </div>
      {uploading && <p className="comment-composer__hint text-muted">Uploading…</p>}
      {toolError && <p className="community-new-post__error">{toolError}</p>}
    </div>
  );
}
