import { spawn } from "node:child_process";
import fs from "node:fs";

const PORT = process.env.SMOKE_PORT || "3100";
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "smoke-console-password";
const SESSION_SECRET = process.env.SESSION_SECRET || "smoke-session-secret";
const MEMBER_PASSWORD = "Sm0ke-Test-Pass!";
const jar = new Map();
const results = [];

const rolesSource = fs.readFileSync(new URL("../lib/roles.js", import.meta.url), "utf8");
const owner = rolesSource.match(/export const SUPER_OWNER = "([^"]+)"/)?.[1];
if (!owner) {
  console.error("smoke: could not read SUPER_OWNER from lib/roles.js");
  process.exit(1);
}

function remember(res) {
  for (const cookie of res.headers.getSetCookie?.() || []) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function req(method, path, body) {
  const headers = body ? { "Content-Type": "application/json" } : {};
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  remember(res);
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", PORT],
  {
    env: { ...process.env, NODE_ENV: "production", ADMIN_PASSWORD, SESSION_SECRET, SITE_URL: BASE },
    stdio: ["ignore", "inherit", "inherit"],
  }
);

function stop(code) {
  server.kill("SIGTERM");
  setTimeout(() => server.kill("SIGKILL"), 3000).unref();
  server.on("exit", () => process.exit(code));
}

async function ready() {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + "/");
      if (res.status === 200) return true;
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

if (!(await ready())) {
  console.error("smoke: the server did not become ready");
  stop(1);
} else {
  const home = await req("GET", "/");
  check("home page renders", home.status === 200, String(home.status));

  const loginPage = await req("GET", "/login");
  check("login page renders", loginPage.status === 200, String(loginPage.status));

  const anonMember = await req("GET", "/api/auth/member");
  check("anonymous member lookup is empty", anonMember.status === 200 && anonMember.text.includes('"member":null'), anonMember.text.slice(0, 60));

  const anonAdmin = await req("GET", "/api/admin/accounts");
  check("admin api rejects anonymous", anonAdmin.status === 401, String(anonAdmin.status));

  const weak = await req("POST", "/api/auth/register", {
    username: "smokeweak",
    name: "Smoke Weak",
    password: "password123",
    confirmPassword: "password123",
  });
  check("common password rejected", weak.status === 400, `${weak.status} ${weak.text.slice(0, 60)}`);

  const registered = await req("POST", "/api/auth/register", {
    username: owner,
    name: "Smoke Owner",
    email: "",
    password: MEMBER_PASSWORD,
    confirmPassword: MEMBER_PASSWORD,
  });
  check("member registration", registered.status === 200, `${registered.status} ${registered.text.slice(0, 60)}`);

  const memberLogin = await req("POST", "/api/auth/member", {
    username: owner,
    password: MEMBER_PASSWORD,
  });
  check("member login", memberLogin.status === 200, String(memberLogin.status));

  const memberSession = await req("GET", "/api/auth/member");
  check("member session reads the cookie", memberSession.text.includes(owner), memberSession.text.slice(0, 60));

  const consoleLogin = await req("POST", "/api/auth/login", {
    username: "someone-else",
    password: ADMIN_PASSWORD,
  });
  check(
    "console login ignores a supplied username",
    consoleLogin.status === 200 && consoleLogin.text.includes(`"username":"${owner}"`),
    `${consoleLogin.status} ${consoleLogin.text.slice(0, 70)}`
  );

  const badConsole = await req("POST", "/api/auth/login", { password: "definitely-wrong" });
  check("console login rejects a bad password", badConsole.status === 401, String(badConsole.status));

  const ownerAdmin = await req("GET", "/api/admin/accounts");
  check("admin api accepts the owner", ownerAdmin.status === 200, String(ownerAdmin.status));

  const missingForm = await req("GET", "/api/form-builder/forms/smoke-missing");
  check("missing form returns 404", missingForm.status === 404, String(missingForm.status));

  const missingMessage = await req("DELETE", "/api/admin/messages/smoke-missing");
  check("missing message returns 404", missingMessage.status === 404, String(missingMessage.status));

  const bareLogout = await req("GET", "/api/auth/logout");
  check("console logout refuses a bare GET", bareLogout.status === 403, String(bareLogout.status));

  const memberLogoutGet = await req("GET", "/api/auth/member/logout");
  check("member logout is POST only", memberLogoutGet.status === 405, String(memberLogoutGet.status));

  const consoleLogout = await req("POST", "/api/auth/logout");
  const closed = await req("GET", "/api/admin/accounts");
  check("console logout closes the session", consoleLogout.status === 200 && closed.status === 401, `${consoleLogout.status}/${closed.status}`);

  const removedRoute = await req("GET", "/api/auth/verify?token=smoke");
  check("removed verification route is gone", removedRoute.status === 404, String(removedRoute.status));

  const resetUnknown = await req("POST", "/api/auth/password/request", { email: "smoke-unknown@example.com" });
  check(
    "reset request does not reveal accounts",
    resetUnknown.status !== 404 && !resetUnknown.text.includes("no_account"),
    `${resetUnknown.status} ${resetUnknown.text.slice(0, 50)}`
  );

  const memberLogout = await req("POST", "/api/auth/member/logout");
  check("member logout", memberLogout.status === 200, String(memberLogout.status));

  let throttled = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const res = await req("POST", "/api/auth/member", { username: owner, password: "wrong-password" });
    if (res.status === 429) {
      throttled = res;
      break;
    }
  }
  check(
    "repeated member logins are throttled",
    Boolean(throttled) && Boolean(throttled.headers.get("retry-after")),
    throttled ? `${throttled.status} retry-after=${throttled.headers.get("retry-after")}` : "no 429 seen"
  );

  const failed = results.filter((entry) => !entry.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) console.log(`FAILED: ${failed.map((entry) => entry.name).join(" | ")}`);
  stop(failed.length ? 1 : 0);
}
