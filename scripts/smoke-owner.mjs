// The super owner's handle is reserved, so the account can only come from
// data/users.json. The smoke suite needs a real owner session to test the
// console, so this writes one with a throwaway password before the build that
// smoke runs against. It is a test fixture: never point a real deployment at a
// data/users.json seeded like this.
import crypto from "node:crypto";
import fs from "node:fs";

const USERS_FILE = new URL("../data/users.json", import.meta.url);
const ROLES_FILE = new URL("../lib/roles.js", import.meta.url);

const owner = fs.readFileSync(ROLES_FILE, "utf8").match(/export const SUPER_OWNER = "([^"]+)"/)?.[1];
if (!owner) {
  console.error("smoke:seed: could not read SUPER_OWNER from lib/roles.js");
  process.exit(1);
}

const password = process.env.SMOKE_OWNER_PASSWORD || "Sm0ke-Owner-Pass!";
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");

const file = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
const users = (Array.isArray(file.users) ? file.users : []).filter(
  (user) => String(user?.username || "").trim().toLowerCase() !== owner
);
users.push({ username: owner, name: "Smoke Owner", salt, hash, updatedAt: new Date().toISOString() });

fs.writeFileSync(USERS_FILE, `${JSON.stringify({ ...file, users }, null, 2)}\n`);
console.log(`smoke:seed: added the ${owner} account with the smoke password`);
