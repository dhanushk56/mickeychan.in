import pathlib
import sys

path = pathlib.Path("components/admin/AdminDashboard.js")
src = path.read_text(encoding="utf-8")


def rep(old, new):
    global src
    count = src.count(old)
    if count != 1:
        sys.exit("expected 1 match, found %d for: %r" % (count, old[:60]))
    src = src.replace(old, new)


rep(
    '''        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            style={account.formBlocked ? undefined : { color: "var(--danger)" }}''',
    '''        <div className="flex w-full shrink-0 flex-col items-stretch gap-1.5 sm:w-44">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={account.formBlocked ? undefined : { color: "var(--danger)" }}''',
)

rep(
    '''          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !canEdit}
            onClick={openDetails}''',
    '''          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy || !canEdit}
            onClick={openDetails}''',
)

rep(
    '''          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--danger)" }}
            disabled={busy || !canDelete}
            onClick={() => onDelete(account)}''',
    '''          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: "var(--danger)" }}
            disabled={busy || !canDelete}
            onClick={() => onDelete(account)}''',
)

rep(
    '''              className="select"
              style={{ maxWidth: "11rem" }}''',
    '''              className="select"
              style={{ maxWidth: "11rem", width: "100%", fontSize: ".78rem", padding: ".45rem .7rem" }}''',
)

rep(
    '''      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 mt-3">
        <label className="field flex-1" style={{ minWidth: "12rem" }}>
          <span className="field-label">New password</span>
          <input
            className="input"
            type="password"
            value={password}
            disabled={!canPassword}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          className="btn btn-secondary btn-sm"
          disabled={busy || password.length < 8 || !canPassword}
        >
          {busy ? "Saving…" : "Set password"}
        </button>
      </form>

''',
    "",
)

rep('  const [password, setPassword] = useState("");\n', "")

rep(
    '''  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return;
    setBusy(true);
    const ok = await onPassword(account, password);
    setBusy(false);
    if (ok) setPassword("");
  }

''',
    "",
)

rep("  onPassword,\n", "")
rep("  canPassword,\n", "")
rep("                  onPassword={changeAccountPassword}\n", "")
rep('                  canPassword={can("accounts.password")}\n', "")

rep(
    '''  async function changeAccountPassword(account, password) {
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(account.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not change that password.");
      setError("");
      setNotice(`Password updated for @${account.username} — their old sessions are signed out.`);
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

''',
    "",
)

path.write_text(src, encoding="utf-8")
print("patched", path)
