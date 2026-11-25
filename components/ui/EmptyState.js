export default function EmptyState({ title, description, action, children, className = "" }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <p className="font-display text-lg font-bold">{title}</p>
      {description && <p className="muted text-sm max-w-md">{description}</p>}
      {action}
      {children}
    </div>
  );
}
