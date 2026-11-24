import pathlib

path = pathlib.Path("components/admin/AdminDashboard.js")
src = path.read_text(encoding="utf-8")

old = '''        <div className="flex w-full shrink-0 flex-col items-stretch gap-1.5 sm:w-44">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={account.formBlocked ? undefined : { color: "var(--danger)" }}
            disabled={busy || !canBlock}
            onClick={() => onBlacklist(account)}
          >
            {account.formBlocked ? "Allow forms" : "Block forms"}
          </button>
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
            style={{ color: "var(--danger)" }}
            disabled={busy || !canDelete}
            onClick={() => onDelete(account)}
          >
            Delete account
          </button>
        </div>'''

new = '''        <div className="flex w-full shrink-0 flex-col items-stretch gap-1.5 sm:w-44">
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

if src.count(old) != 1:
    raise SystemExit("expected exactly one actions block, found %d" % src.count(old))

path.write_text(src.replace(old, new), encoding="utf-8")
print("actions reordered into editing + destructive groups")
