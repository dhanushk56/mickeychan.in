"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";

async function call(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "That didn't work.");
  return data;
}

function formatWhen(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sourceLabel(entry) {
  if (entry.root) return "Founder · can't be removed or changed";
  if (entry.owner) return "Super owner · only the founder can change this";
  const when = formatWhen(entry.grantedAt);
  return entry.grantedBy
    ? `Granted by ${entry.grantedBy}${when ? ` · ${when}` : ""}`
    : "Granted from the Accounts tab";
}

function RoleBadge({ entry }) {
  const tone = entry.owner ? "badge-accepted" : "badge-pending";
  return <span className={`badge ${tone}`}>{entry.owner ? "Super owner" : entry.roleName}</span>;
}

function permissionCount(permissions) {
  if (!Array.isArray(permissions)) return 0;
  if (permissions.includes("*")) return "every";
  return permissions.length;
}

export function AdminsPanel({ canManage }) {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [dialog, askConfirm] = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call("/api/admin/admins");
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
      setRoles(Array.isArray(data.roles) ? data.roles : []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(entry, roleId) {
    if (!roleId) return;
    setBusy(entry.username);
    try {
      const data = await call("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: entry.username, roleId }),
      });
      setAdmins(data.admins || []);
      setRoles(data.roles || roles);
      setNotice(`@${entry.username} is now ${roles.find((role) => role.id === roleId)?.name || roleId}.`);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function remove(entry) {
    const ok = await askConfirm({
      title: "Remove console access?",
      description: `@${entry.username} will be signed out of the admin console and lose every permission.`,
      confirmLabel: "Remove access",
    });
    if (!ok) return;
    setBusy(entry.username);
    try {
      const data = await call(`/api/admin/admins?username=${encodeURIComponent(entry.username)}`, {
        method: "DELETE",
      });
      setAdmins(data.admins || []);
      setRoles(data.roles || roles);
      setNotice(`@${entry.username} no longer has console access.`);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm max-w-xl">
          Every account that can open this console and the role it holds. Higher roles sit above
          lower ones, so an admin can only change people below their own role.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="badge badge-denied">{error}</p>}
      {notice && <p className="badge badge-accepted">{notice}</p>}

      {admins.length === 0 && !loading ? (
        <div className="empty-state">
          <p className="font-display font-bold">Nobody yet</p>
          <p className="muted text-sm">Grant access from the Accounts tab.</p>
        </div>
      ) : (
        admins.map((entry) => {
          const canChange = canManage && entry.root !== true && entry.manageable !== false;
          return (
            <article key={entry.username} className="glass-card application-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">@{entry.username}</h3>
                    <RoleBadge entry={entry} />
                    <span className="badge badge-neutral">{permissionCount(entry.permissions)} permissions</span>
                    {entry.root && <span className="badge badge-accepted">Protected</span>}
                    {entry.manageable === false && (
                      <span className="badge badge-neutral">Above your role</span>
                    )}
                  </div>
                  <p className="faint text-xs mt-1">{sourceLabel(entry)}</p>
                  {entry.description && <p className="muted text-sm mt-2">{entry.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="select"
                    style={{ maxWidth: "12rem" }}
                    value={entry.owner ? "owner" : entry.roleId}
                    disabled={!canChange || busy === entry.username}
                    onChange={(event) => setRole(entry, event.target.value)}
                  >
                    {entry.owner && <option value="owner">Super owner</option>}
                    {roles
                      .filter((role) => !(entry.owner && role.id === "owner"))
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                  {canChange && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: "var(--danger)" }}
                      disabled={busy === entry.username}
                      onClick={() => remove(entry)}
                    >
                      Remove access
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}
      {dialog}
    </div>
  );
}

function ReorderHandle({ role, onArm, onMove }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ cursor: "grab", letterSpacing: ".18em", lineHeight: 1 }}
      aria-label={`Move the ${role.name} role`}
      title="Drag to set the hierarchy, or press the up and down arrows"
      onMouseDown={() => onArm(role.id)}
      onTouchStart={() => onArm(role.id)}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onMove(role.id, -1);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onMove(role.id, 1);
        }
      }}
    >
      ⠿
    </button>
  );
}

function RoleEditor({
  role,
  index,
  canManage,
  reorderable,
  dragging,
  dropping,
  catalog,
  onArm,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMove,
  onSaved,
  onDeleted,
  onError,
  onNotice,
  expanded,
  onToggle,
}) {
  const [draft, setDraft] = useState({
    name: role.name,
    description: role.description,
    permissions: Array.isArray(role.permissions) && !role.permissions.includes("*") ? role.permissions : [],
  });
  const [busy, setBusy] = useState(false);
  const [dialog, askConfirm] = useConfirm();
  const locked = role.locked;
  const canEdit = canManage && role.editable !== false;

  function toggle(id) {
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(id)
        ? current.permissions.filter((entry) => entry !== id)
        : [...current.permissions, id],
    }));
  }

  async function save() {
    setBusy(true);
    try {
      const data = await call("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: role.id, ...draft }),
      });
      onSaved(data.roles || []);
      onNotice(`Saved the ${draft.name} role.`);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await askConfirm({
      title: `Delete the ${role.name} role?`,
      description: "Anyone holding it moves to the Viewer role. This can't be undone.",
      confirmLabel: "Delete role",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const data = await call(`/api/admin/roles?id=${encodeURIComponent(role.id)}`, { method: "DELETE" });
      onDeleted(data.roles || []);
      onNotice(`Deleted the ${role.name} role.`);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="glass-card application-card"
      data-locked={locked}
      draggable={reorderable}
      onDragStart={(event) => reorderable && onDragStart(event, role.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!reorderable) return;
        event.preventDefault();
        onDragOver(role.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(role.id);
      }}
      style={{
        opacity: dragging ? 0.55 : undefined,
        outline: dropping ? "1px solid var(--accent)" : undefined,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="icon-button"
            aria-expanded={expanded}
            title={expanded ? "Collapse this role" : "Expand this role"}
            aria-label={expanded ? `Collapse ${role.name}` : `Expand ${role.name}`}
            onClick={onToggle}
          >
            <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
          </button>
          {reorderable && <ReorderHandle role={role} onArm={onArm} onMove={onMove} />}
          <h3 className="font-display font-bold">{role.name}</h3>
          {locked && <span className="badge badge-accepted">Locked</span>}
          <span className="badge badge-neutral">
            {index === 0 ? "Top of the hierarchy" : `Level ${index + 1}`}
          </span>
          <span className="badge badge-neutral">{permissionCount(role.permissions)} permissions</span>
          <span className="badge badge-neutral">
            {role.members} {role.members === 1 ? "account" : "accounts"}
          </span>
        </div>
        {expanded && canEdit && !locked && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save role"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: "var(--danger)" }}
              onClick={remove}
              disabled={busy}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {!expanded && role.description && (
        <p className="muted text-xs mt-2">{role.description}</p>
      )}

      {expanded && (
        <>
      <div className="flex flex-wrap items-end gap-2 mt-3">
        <label className="field flex-1" style={{ minWidth: "12rem" }}>
          <span className="field-label">Name</span>
          <input
            className="input"
            value={draft.name}
            disabled={!canEdit || locked}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label className="field flex-1" style={{ minWidth: "14rem" }}>
          <span className="field-label">Description</span>
          <input
            className="input"
            value={draft.description}
            disabled={!canEdit || locked}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
      </div>

      {locked ? (
        <p className="muted text-sm mt-3">
          Every permission is on and nothing here can be turned off. Only the founder decides who
          holds this role.
        </p>
      ) : (
        <div className="grid gap-3 mt-4">
          {catalog.map((group) => (
            <div key={group.id}>
              <p className="faint text-xs font-bold uppercase tracking-wide">{group.label}</p>
              <div className="grid gap-1.5 sm:grid-cols-2 mt-1.5">
                {group.permissions.map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.permissions.includes(permission.id)}
                      disabled={!canEdit}
                      onChange={() => toggle(permission.id)}
                    />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}
      {dialog}
    </article>
  );
}

export function RolesPanel({ canManage, canManageAdmins }) {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [canGrantOwner, setCanGrantOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", permissions: [] });
  const [dragId, setDragId] = useState("");
  const [dropId, setDropId] = useState("");
  // Roles start folded: the names and permission counts are enough to scan the
  // hierarchy, and one role can be opened when it needs changing.
  const [expanded, setExpanded] = useState([]);
  const armed = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const roleData = await call("/api/admin/roles");
      setRoles(Array.isArray(roleData.roles) ? roleData.roles : []);
      setCatalog(Array.isArray(roleData.catalog) ? roleData.catalog : []);
      setCanGrantOwner(roleData.canGrantOwner === true);
      try {
        const adminData = await call("/api/admin/admins");
        setAdmins(Array.isArray(adminData.admins) ? adminData.admins : []);
      } catch {
        setAdmins([]);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDraft(id) {
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(id)
        ? current.permissions.filter((entry) => entry !== id)
        : [...current.permissions, id],
    }));
  }

  async function create(event) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const data = await call("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setRoles(data.roles || []);
      setDraft({ name: "", description: "", permissions: [] });
      setNotice(`Created the ${draft.name} role. It sits at the bottom until you move it.`);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function setRole(entry, roleId) {
    if (!roleId) return;
    setBusy(entry.username);
    try {
      const data = await call("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: entry.username, roleId }),
      });
      setAdmins(data.admins || []);
      setNotice(`@${entry.username} is now ${roles.find((role) => role.id === roleId)?.name || roleId}.`);
      setError("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function saveOrder(list) {
    try {
      const data = await call("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: list.map((role) => role.id) }),
      });
      setRoles(Array.isArray(data.roles) ? data.roles : list);
      setNotice("Saved the role hierarchy.");
      setError("");
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  function reorder(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const from = roles.findIndex((role) => role.id === fromId);
    const to = roles.findIndex((role) => role.id === toId);
    if (from === -1 || to === -1) return;
    if (roles[from].locked || roles[to].locked) return;
    const next = [...roles];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRoles(next);
    saveOrder(next);
  }

  function move(id, delta) {
    const from = roles.findIndex((role) => role.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= roles.length) return;
    if (roles[from].locked || roles[to].locked) return;
    reorder(id, roles[to].id);
  }

  function startDrag(event, id) {
    if (armed.current !== id) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDragId(id);
    setDropId("");
  }

  function endDrag() {
    armed.current = "";
    setDragId("");
    setDropId("");
  }

  function dropOn(id) {
    if (dragId && dragId !== id) reorder(dragId, id);
    endDrag();
  }

  const allExpanded = roles.length > 0 && roles.every((role) => expanded.includes(role.id));

  if (loading && roles.length === 0) {
    return <div className="glass-card p-8 muted">Loading roles…</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm max-w-xl">
          Roles decide what each admin can do, and their order is the hierarchy: higher roles sit
          above lower ones. Drag a role by its handle to move it. An admin can only manage roles and
          admins below their own, never their own role or anyone at or above it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              setExpanded(
                allExpanded ? [] : roles.map((role) => role.id)
              )
            }
            disabled={roles.length === 0}
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="badge badge-denied">{error}</p>}
      {notice && <p className="badge badge-accepted">{notice}</p>}

      {canManage && (
        <form onSubmit={create} className="glass-card application-card grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold">Create a role</h3>
            <span className="badge badge-neutral">Lands at the bottom</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="field flex-1" style={{ minWidth: "12rem" }}>
              <span className="field-label">Name</span>
              <input
                className="input"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Editor"
                maxLength={48}
                required
              />
            </label>
            <label className="field flex-1" style={{ minWidth: "14rem" }}>
              <span className="field-label">What it is for (optional)</span>
              <input
                className="input"
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="One line the other admins will read"
                maxLength={200}
              />
            </label>
          </div>
          <div className="grid gap-3">
            {catalog.map((group) => (
              <div key={group.id}>
                <p className="faint text-xs font-bold uppercase tracking-wide">{group.label}</p>
                <div className="grid gap-1.5 sm:grid-cols-2 mt-1.5">
                  {group.permissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.permissions.includes(permission.id)}
                        onChange={() => toggleDraft(permission.id)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={creating || draft.name.trim().length < 2}
            >
              {creating ? "Creating…" : "Create role"}
            </button>
            <span className="faint text-xs">
              {draft.permissions.length} permission{draft.permissions.length === 1 ? "" : "s"} selected
            </span>
          </div>
        </form>
      )}

      {roles.map((role, index) => (
        <RoleEditor
          key={role.id}
          role={role}
          index={index}
          expanded={expanded.includes(role.id)}
          onToggle={() =>
            setExpanded((current) =>
              current.includes(role.id)
                ? current.filter((id) => id !== role.id)
                : [...current, role.id]
            )
          }
          canManage={canManage}
          reorderable={canManage && !role.locked && role.editable !== false}
          dragging={dragId === role.id}
          dropping={dropId === role.id && dragId !== role.id}
          catalog={catalog}
          onArm={(id) => {
            armed.current = id;
          }}
          onDragStart={startDrag}
          onDragEnd={endDrag}
          onDragOver={setDropId}
          onDrop={dropOn}
          onMove={move}
          onSaved={setRoles}
          onDeleted={setRoles}
          onError={setError}
          onNotice={setNotice}
        />
      ))}

      <div className="glass-card application-card">
        <h3 className="font-display font-bold">Who holds which role</h3>
        <p className="faint text-xs mt-1">
          Set a role beside any account with console access. Accounts without access are in the
          Accounts tab.
        </p>
        <div className="grid gap-2 mt-3">
          {admins.map((entry) => {
            const canChange = canManageAdmins && entry.root !== true && entry.manageable !== false;
            return (
              <div key={entry.username} className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-neutral">@{entry.username}</span>
                  <RoleBadge entry={entry} />
                  {entry.manageable === false && (
                    <span className="badge badge-neutral">Above your role</span>
                  )}
                </div>
                <select
                  className="select"
                  style={{ maxWidth: "12rem" }}
                  value={entry.owner ? "owner" : entry.roleId}
                  disabled={!canChange || busy === entry.username}
                  onChange={(event) => setRole(entry, event.target.value)}
                >
                  {entry.owner && <option value="owner">Super owner</option>}
                  {canGrantOwner && !entry.owner && <option value="owner">Super owner</option>}
                  {roles
                    .filter((role) => !role.locked)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
