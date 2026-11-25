export default function MaintenanceScreen({ message }) {
  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "34rem" }}>
        <div className="glass-card p-8 animate-rise grid gap-4">
          <p className="kicker">Back soon</p>
          <h1 className="display-lg">The site is closed for maintenance.</h1>
          <p className="muted leading-relaxed">{message}</p>
          <p className="faint text-xs leading-relaxed">
            Nothing is lost. Videos, stories and the forums will be here when it reopens.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/admin" className="btn btn-secondary btn-sm">
              Staff sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
