export default function MaintenanceScreen({ message }) {
  return (
    <div
      className="flex items-center justify-center p-4"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="glass-card p-8 animate-rise grid gap-4 text-center justify-items-center w-full"
        style={{ maxWidth: "34rem" }}
      >
        <p className="kicker justify-center">Back soon</p>
        <h1 className="display-lg">The site is closed for maintenance.</h1>
        <p className="muted leading-relaxed">{message}</p>
        <p className="faint text-xs leading-relaxed">
          Nothing is lost. Videos, stories and the forums will be here when it reopens.
        </p>
        <a href="/admin" className="btn btn-secondary btn-sm">
          Staff sign in
        </a>
      </div>
    </div>
  );
}
