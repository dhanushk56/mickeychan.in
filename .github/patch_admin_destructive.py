import pathlib

path = pathlib.Path("components/admin/AdminDashboard.js")
src = path.read_text(encoding="utf-8")

pairs = [
    (
        '''            className="btn btn-ghost btn-sm"
            style={account.formBlocked ? undefined : { color: "var(--danger)" }}
            disabled={busy || !canBlock}''',
        '''            className="btn btn-secondary btn-sm"
            style={account.formBlocked ? undefined : { color: "var(--danger)" }}
            disabled={busy || !canBlock}''',
    ),
    (
        '''            className="btn btn-ghost btn-sm"
            style={{ color: "var(--danger)" }}
            disabled={busy || !canDelete}''',
        '''            className="btn btn-secondary btn-sm"
            style={{ color: "var(--danger)" }}
            disabled={busy || !canDelete}''',
    ),
]

for old, new in pairs:
    if src.count(old) != 1:
        raise SystemExit("expected exactly one match, found %d" % src.count(old))
    src = src.replace(old, new)

path.write_text(src, encoding="utf-8")
print("destructive actions now use the pill surface")
