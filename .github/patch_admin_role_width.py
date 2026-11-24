import pathlib

path = pathlib.Path("components/admin/AdminDashboard.js")
src = path.read_text(encoding="utf-8")

old = 'style={{ maxWidth: "11rem", width: "100%", fontSize: ".78rem", padding: ".45rem .7rem" }}'
new = 'style={{ width: "100%", fontSize: ".78rem", padding: ".45rem .7rem" }}'

if old not in src:
    raise SystemExit("role picker style not found")

path.write_text(src.replace(old, new, 1), encoding="utf-8")
print("relaxed the role picker width")
