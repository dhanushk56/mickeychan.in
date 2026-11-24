import pathlib

path = pathlib.Path("components/admin/AdminDashboard.js")
src = path.read_text(encoding="utf-8")

old = '''        <div className="flex w-full shrink-0 flex-col items-stretch gap-1.5 sm:w-44">
          {canManageAdmins && (
            <select
              className="select"
              style={{ width: "100%", fontSize: ".78rem", padding: ".45rem .7rem" }}
              value={adminEntry ? (adminEntry.owner ? "owner" : adminEntry.roleId) : ""}
              disabled={busy || adminEntry?.root || adminEntry?.manageable === false}
              onChange={(event) => onRoleChange(account, event.target.value)}
            >
              <option value="">No console access</option>
              {adminEntry?.owner && <option value="owner">Super owner</option>}
              {roles
                .filter((role) => !(adminEntry?.owner && role.id === "owner"))
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy || !canEdit}
            onClick={openDetails}
          >
            Edit details
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              marginTop: ".4rem",
              ...(account.formBlocked ? {} : { color: "var(--danger)" }),
            }}
            disabled={busy || !canBlock}
            onClick={() => onBlacklist(account)}
          >
            {account.formBlocked ? "Allow forms" : "Block forms"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: "var(--danger)" }}
            disabled={busy || !canDelete}
            onClick={() => onDelete(account)}
          >
            Delete account
          </button>
        </div>'''

new = '''        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44">
          <div className="flex flex-col gap-1.5">
            {canManageAdmins && (
              <select
                className="select"
                style={{ width: "100%", fontSize: ".78rem", padding: ".45rem .7rem" }}
                value={adminEntry ? (adminEntry.owner ? "owner" : adminEntry.roleId) : ""}
                disabled={adminEntry?.root || adminEntry?.manageable === false}
                onChange={(event) => onRoleChange(account, event.target.value)}
              >
                <option value="">No console access</option>
                {adminEntry?.owner && <option value="owner">Super owner</option>}
                {roles
                  .filter((role) => !(adminEntry?.owner && role.id === "owner"))
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!canEdit}
              onClick={openDetails}
            >
              Edit details
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={account.formBlocked ? undefined : { color: "var(--danger)" }}
              disabled={!canBlock}
              onClick={() => onBlacklist(account)}
            >
              {account.formBlocked ? "Allow forms" : "Block forms"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ color: "var(--danger)" }}
              disabled={!canDelete}
              onClick={() => onDelete(account)}
            >
              Delete account
            </button>
          </div>
        </div>'''

busy = "  const [busy, setBusy] = useState(false);\n"

if src.count(old) != 1:
    raise SystemExit("expected one actions block, found %d" % src.count(old))
if src.count(busy) != 1:
    raise SystemExit("expected one busy state, found %d" % src.count(busy))

src = src.replace(old, new).replace(busy, "")
path.write_text(src, encoding="utf-8")
print("cleaned up the account action column")
