import "./common.css";

export default function EmptyState({ icon: Icon, title, description, children, tone = "default" }) {
  return (
    <div className={`empty-state empty-state--${tone}`}>
      {Icon && (
        <span className="empty-state__icon">
          <Icon size={28} />
        </span>
      )}
      <h2 className="empty-state__title">{title}</h2>
      {description && <p className="empty-state__description">{description}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  );
}
