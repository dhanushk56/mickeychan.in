export function SkeletonBar({ width = "100%", height = "0.75rem" }) {
  return <span className="skeleton-bar" style={{ width, height }} aria-hidden="true" />;
}

export default function Skeleton({ lines = 3, className = "" }) {
  return (
    <div className={`glass-card p-6 grid gap-3 ${className}`.trim()} aria-hidden="true">
      <SkeletonBar width="45%" height="1.05rem" />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBar key={index} width={index === lines - 1 ? "65%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, lines = 3, className = "grid gap-4 grid-cols-1 md:grid-cols-2" }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} lines={lines} />
      ))}
    </div>
  );
}
