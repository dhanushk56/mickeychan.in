import crypto from "node:crypto";
import usersFile from "@/data/users.json";
import { createRecord, deleteRecord, listRecords, readRecordsMap, saveRecord } from "@/lib/record-store";
import { isRootOwner, loadGrants, loadOwners, normalizeUsername, saveGrants, saveOwners } from "@/lib/roles";

const MEMBER_COOKIE = "mc_member_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REGISTERED_KEY = "members:registered";
const REGISTERED_RECORDS_KEY = "members:registered:records";
const OVERRIDES_KEY = "members:overrides";
const OVERRIDES_RECORDS_KEY = "members:overrides:records";
const DELETED_KEY = "members:deleted";
const DELETED_RECORDS_KEY = "members:deleted:records";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_LOCK_MS = 1000 * 60 * 60 * 24 * 182;
const MAX_AVATAR_CHARS = 220000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "87654321",
  "abc12345",
  "admin123",
  "asdfghjk",
  "baseball",
  "batman123",
  "changeme",
  "dragon123",
  "football",
  "iloveyou",
  "letmein",
  "mickey123",
  "mickeychan",
  "monkey123",
  "passw0rd",
  "password",
  "password1",
  "password123",
  "princess",
  "qwerty123",
  "qwertyui",
  "secret123",
  "starwars",
  "sunshine",
  "superman",
  "trustno1",
  "welcome1",
  "whatever1",
  "zxcvbnm1",
]);

function normalize(username) {
  return String(username || "").trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function emailProblem(email) {
  const value = normalizeEmail(email);
  if (!value) return "Enter your email address.";
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
    return "That email address doesn't look right.";
  }
  return null;
}

function seedMembers() {
  return Array.isArray(usersFile?.users) ? usersFile.users : [];
}

function registeredMembers() {
  return listRecords(REGISTERED_KEY, REGISTERED_RECORDS_KEY, (entry) => normalize(entry?.username));
}

function passwordOverrides() {
  return readRecordsMap(OVERRIDES_KEY, OVERRIDES_RECORDS_KEY);
}

function deletedUsernames() {
  return listRecords(DELETED_KEY, DELETED_RECORDS_KEY, deletionHandle);
}

function deletionHandle(entry) {
  return normalize(typeof entry === "string" ? entry : entry?.username);
}

function matchesDeletion(entry, member) {
  if (deletionHandle(entry) !== normalize(member.username)) return false;
  if (typeof entry === "string") return true;
  return !entry.hash || entry.hash === member.hash;
}

function dedupeSeed(users) {
  const handles = new Set();
  const emails = new Set();
  const kept = [];
  const dropped = [];

  for (const user of users) {
    const handle = normalize(user.username);
    const email = normalizeEmail(user.email);
    if (!handle || handles.has(handle) || (email && emails.has(email))) {
      dropped.push(String(user.username || "(no username)"));
      continue;
    }
    handles.add(handle);
    if (email) emails.add(email);
    kept.push(user);
  }

  if (dropped.length > 0) {
    console.warn(
      `[members] data/users.json has duplicate accounts (${dropped.join(", ")}), later copies are ignored.`
    );
  }

  return kept;
}

async function allMembers() {
  const [registered, overrides, deleted] = await Promise.all([
    registeredMembers(),
    passwordOverrides(),
    deletedUsernames(),
  ]);
  const seed = dedupeSeed(
    seedMembers().filter((user) => !deleted.some((entry) => matchesDeletion(entry, user)))
  ).map((user) => {
    const override = overrides[normalize(user.username)] || {};
    return {
      ...user,
      ...override,
      source: "file",
    };
  });

  const registeredHandles = new Set(registered.map((user) => normalize(user.username)));
  const clashes = seed
    .filter((user) => registeredHandles.has(normalize(user.username)))
    .map((user) => user.username);
  if (clashes.length > 0) {
    console.warn(
      `[members] ${clashes.join(", ")} exist in both data/users.json and the account store, and the data/users.json entry wins.`
    );
  }

  return [...seed, ...registered.map((user) => ({ ...user, source: "registered" }))];
}

export async function findMember(username) {
  const needle = normalize(username);
  if (!needle) return null;
  return (await allMembers()).find((user) => normalize(user.username) === needle) || null;
}

export async function findMemberByEmail(email) {
  const needle = normalizeEmail(email);
  if (!needle) return null;
  return (await allMembers()).find((user) => normalizeEmail(user.email) === needle) || null;
}

export async function findMemberByGoogleSub(sub) {
  const needle = String(sub || "").trim();
  if (!needle) return null;
  return (await allMembers()).find((user) => user.googleSub === needle) || null;
}

export async function findMemberByDiscordId(id) {
  const needle = String(id || "").trim();
  if (!needle) return null;
  return (await allMembers()).find((user) => user.discordId === needle) || null;
}

export async function isUsernameTaken(username) {
  if (await findMember(username)) return true;
  const handle = normalize(username);
  return (await deletedUsernames()).some((entry) => deletionHandle(entry) === handle);
}

export async function listMembers() {
  const members = await allMembers();
  return members
    .map((member) => ({
      username: member.username,
      name: member.name || member.username,
      source: member.source,
      email: member.email || null,
      phone: member.phone || null,
      emailVerified: member.emailVerified === true,
      provider:
        member.provider === "google" || member.provider === "discord" ? member.provider : "password",
      createdAt: member.createdAt || null,
      updatedAt: member.updatedAt || null,
      hasPassword: Boolean(member.salt && member.hash),
      createdBy: member.createdBy === "admin" ? "admin" : "self",
    }))
    .sort((a, b) => normalize(a.username).localeCompare(normalize(b.username)));
}

export async function hasMembers() {
  return (await allMembers()).length > 0;
}

function memberInitials(name, username) {
  const source = String(name || username || "").trim();
  if (!source) return "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function avatarOf(member) {
  return typeof member?.avatar === "string" && member.avatar ? member.avatar : null;
}

export function publicMember(member) {
  if (!member) return null;
  return {
    username: member.username,
    name: member.name || member.username,
    email: member.email || null,
    emailVerified: member.emailVerified === true,
    avatar: avatarOf(member),
    initials: memberInitials(member.name, member.username),
    createdAt: member.createdAt || null,
  };
}

function profileChangeWindow(member) {
  const last = Date.parse(member?.profileUpdatedAt || "");
  if (!Number.isFinite(last)) return { canChange: true, nextChangeAt: null };
  const next = last + PROFILE_LOCK_MS;
  return {
    canChange: Date.now() >= next,
    nextChangeAt: new Date(next).toISOString(),
  };
}

export function publicProfile(member) {
  const base = publicMember(member);
  if (!base) return null;
  return {
    ...base,
    phone: member.phone || "",
    provider:
      member.provider === "google" || member.provider === "discord" ? member.provider : "password",
    hasPassword: Boolean(member.salt && member.hash),
    emailChangeable: member.emailVerified !== true,
    profileUpdatedAt: member.profileUpdatedAt || null,
    ...profileChangeWindow(member),
  };
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

export function verifyMemberPassword(member, password) {
  if (!member || typeof password !== "string" || !member.salt || !member.hash) return false;
  const attempt = Buffer.from(hashPassword(password, member.salt), "hex");
  const expected = Buffer.from(String(member.hash), "hex");
  if (attempt.length !== expected.length || expected.length === 0) return false;
  return crypto.timingSafeEqual(attempt, expected);
}

export function isUsernameReserved(username) {
  // The super owner is identified by this handle, so nobody else may hold it
  // through signup, admin creation or a rename. The owner's own account is
  // provisioned in data/users.json, which bypasses these paths.
  return isRootOwner(username);
}

function usernameProblem(username) {
  const handle = normalize(username);
  if (!handle) return "Pick a username.";
  if (isUsernameReserved(handle)) return "That username is already taken.";
  if (!USERNAME_PATTERN.test(handle)) {
    return "Usernames are 3–24 characters: letters, numbers, dot, dash or underscore, starting with a letter or number.";
  }
  return null;
}

export function passwordProblem(password, username = "") {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Passwords can be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return "That password is too common. Pick something less predictable.";
  }
  const handle = normalize(username);
  if (handle && (lower === handle || lower === `${handle}123`)) {
    return "Don't use your username as your password.";
  }
  return null;
}

function normalizeIp(ip) {
  let value = String(ip || "").trim().toLowerCase();
  if (value.startsWith("::ffff:")) value = value.slice(7);
  return value;
}

function cleanIps(ips) {
  const list = Array.isArray(ips) ? ips : [];
  return [...new Set(list.map(normalizeIp).filter(Boolean))].slice(0, 24);
}

async function memberUsingIps(ips) {
  const wanted = new Set(cleanIps(ips));
  if (wanted.size === 0) return null;
  const members = await allMembers();
  return (
    members.find(
      (member) => Array.isArray(member.ips) && member.ips.some((ip) => wanted.has(normalizeIp(ip)))
    ) || null
  );
}

export async function bindMemberIps(username, ips, location = null) {
  const member = await findMember(username);
  if (!member) return null;

  const incoming = cleanIps(ips);
  if (incoming.length === 0) return member;

  const current = Array.isArray(member.ips) ? member.ips.map(normalizeIp).filter(Boolean) : [];
  const merged = [...new Set([...current, ...incoming])].slice(0, 24);
  if (merged.length === current.length) return member;

  const where = location && !member.location ? location : null;

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const index = registered.findIndex((entry) => normalize(entry.username) === normalize(username));
    if (index === -1) return member;
    registered[index] = {
      ...registered[index],
      ips: merged,
      ...(where ? { location: where } : {}),
    };
    await saveRecord(REGISTERED_RECORDS_KEY, normalize(username), registered[index]);
    return registered[index];
  }

  const overrides = await passwordOverrides();
  const next = {
    ...(overrides[normalize(username)] || {}),
    ips: merged,
    ...(where ? { location: where } : {}),
  };
  await saveRecord(OVERRIDES_RECORDS_KEY, normalize(username), next);
  return { ...member, ...next };
}

export async function registerMember({
  username,
  name,
  email = "",
  phone = "",
  password = "",
  ips = [],
  location = null,
  allowSharedIp = false,
  createdBy = "self",
  provider = "password",
  googleSub = "",
  discordId = "",
  emailVerified = false,
}) {
  const external = provider === "google" || provider === "discord";
  const problem = usernameProblem(username) || (external ? null : passwordProblem(password, username));
  if (problem) return { error: problem };

  const emailAddress = normalizeEmail(email);
  if (emailAddress) {
    const emailIssue = emailProblem(emailAddress);
    if (emailIssue) return { error: emailIssue };
  }

  const phoneNumber = String(phone || "").trim();
  if (phoneNumber) {
    const phoneIssue = phoneProblem(phoneNumber);
    if (phoneIssue) return { error: phoneIssue };
  }

  const handle = normalize(username);
  if (await findMember(handle)) return { error: "That username is already taken." };
  if ((await deletedUsernames()).some((entry) => deletionHandle(entry) === handle)) {
    return { error: "That username is already taken." };
  }
  if (emailAddress && (await findMemberByEmail(emailAddress))) {
    return { error: "That email address already belongs to an account.", code: "email_taken" };
  }
  if (provider === "google" && googleSub && (await findMemberByGoogleSub(googleSub))) {
    return { error: "That Google account is already linked to a member.", code: "google_taken" };
  }
  if (provider === "discord" && discordId && (await findMemberByDiscordId(discordId))) {
    return { error: "That Discord account is already linked to a member.", code: "discord_taken" };
  }

  const ipList = allowSharedIp ? [] : cleanIps(ips);
  if (ipList.length > 0 && (await memberUsingIps(ipList))) {
    return {
      error:
        "This internet connection already has an account. Log in with it, or ask the team to create another one for you.",
      code: "ip_limit",
    };
  }

  const member = {
    username: String(username).trim(),
    name: String(name || "").trim() || String(username).trim(),
    provider: provider === "google" || provider === "discord" ? provider : "password",
    ...(emailAddress ? { email: emailAddress } : {}),
    ...(phoneNumber ? { phone: phoneNumber } : {}),
    emailVerified: external ? true : emailVerified === true,
    ...(provider === "google" && googleSub ? { googleSub } : {}),
    ...(provider === "discord" && discordId ? { discordId } : {}),
    ips: ipList,
    createdBy: createdBy === "admin" ? "admin" : "self",
    ...(ipList.length > 0 && location ? { location } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!external) {
    const salt = crypto.randomBytes(16).toString("hex");
    member.salt = salt;
    member.hash = hashPassword(password, salt);
  }

  const created = await createRecord(REGISTERED_RECORDS_KEY, handle, member);
  if (!created) {
    return { error: "That username is already taken.", code: "username_taken" };
  }

  return { member };
}

export async function markEmailVerified(username) {
  const member = await findMember(username);
  if (!member || member.provider === "google") return null;
  const updatedAt = new Date().toISOString();

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const index = registered.findIndex((entry) => normalize(entry.username) === normalize(username));
    if (index === -1) return null;
    registered[index] = { ...registered[index], emailVerified: true, updatedAt };
    await saveRecord(REGISTERED_RECORDS_KEY, normalize(username), registered[index]);
    return registered[index];
  }

  const overrides = await passwordOverrides();
  const next = {
    ...(overrides[normalize(username)] || {}),
    emailVerified: true,
    updatedAt,
  };
  await saveRecord(OVERRIDES_RECORDS_KEY, normalize(username), next);
  return { ...member, ...next };
}

export async function attachEmail(username, email) {
  const problem = emailProblem(email);
  if (problem) return { error: problem };

  const address = normalizeEmail(email);
  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };
  if (member.provider === "google" || member.provider === "discord") {
    return { error: "This account already signs in with Google or Discord." };
  }
  if (member.emailVerified === true) return { error: "This account's email is already confirmed." };

  const other = await findMemberByEmail(address);
  if (other && normalize(other.username) !== normalize(username)) {
    return { error: "That email address already belongs to an account." };
  }

  const updatedAt = new Date().toISOString();

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const index = registered.findIndex((entry) => normalize(entry.username) === normalize(username));
    if (index === -1) return { error: "No account with that username." };
    registered[index] = { ...registered[index], email: address, emailVerified: false, updatedAt };
    await saveRecord(REGISTERED_RECORDS_KEY, normalize(username), registered[index]);
    return { member: registered[index] };
  }

  const overrides = await passwordOverrides();
  const next = {
    ...(overrides[normalize(username)] || {}),
    email: address,
    emailVerified: false,
    updatedAt,
  };
  await saveRecord(OVERRIDES_RECORDS_KEY, normalize(username), next);
  return { member: { ...member, ...next } };
}

export async function setMemberPassword(username, password) {
  const problem = passwordProblem(password, username);
  if (problem) return { error: problem };

  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };
  if (member.provider === "google" || member.provider === "discord") {
    return { error: "This account signs in with Google or Discord, so it has no password to set." };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const updatedAt = new Date().toISOString();
  const next = { salt, hash: hashPassword(password, salt), updatedAt };

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const index = registered.findIndex((entry) => normalize(entry.username) === normalize(username));
    if (index === -1) return { error: "No account with that username." };
    registered[index] = { ...registered[index], ...next };
    await saveRecord(REGISTERED_RECORDS_KEY, normalize(username), registered[index]);
  } else {
    const overrides = await passwordOverrides();
    await saveRecord(OVERRIDES_RECORDS_KEY, normalize(username), {
      ...(overrides[normalize(username)] || {}),
      ...next,
    });
  }

  return { member: { ...member, ...next } };
}

function nameProblem(name) {
  const value = String(name || "").trim();
  if (!value) return "Enter the name you want shown on your account.";
  if (value.length > 60) return "Keep your name to 60 characters or fewer.";
  return null;
}

function phoneProblem(phone) {
  const value = String(phone || "").trim();
  if (!value) return null;
  if (value.length > 24) return "That phone number is too long.";
  if (!/^[+]?[\d ().-]{6,24}$/.test(value)) {
    return "Use digits, spaces, +, - and brackets only.";
  }
  return null;
}

function avatarProblem(dataUrl) {
  const value = String(dataUrl || "");
  if (!value) return "Pick an image first.";
  if (value.length > MAX_AVATAR_CHARS) return "That image is too large. Pick a smaller one.";
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return "Images need to be PNG, JPEG or WebP.";
  }
  return null;
}

async function saveMemberPatch(member, patch) {
  const handle = normalize(member.username);

  if (member.source === "registered") {
    const registered = await registeredMembers();
    const index = registered.findIndex((entry) => normalize(entry.username) === handle);
    if (index === -1) return null;
    registered[index] = { ...registered[index], ...patch };
    await saveRecord(REGISTERED_RECORDS_KEY, handle, registered[index]);
    return registered[index];
  }

  const overrides = await passwordOverrides();
  const next = { ...(overrides[handle] || {}), ...patch };
  await saveRecord(OVERRIDES_RECORDS_KEY, handle, next);
  return { ...member, ...next };
}

function withoutSource(member) {
  const { source, ...rest } = member;
  return rest;
}

async function saveMemberRecord(member, patch, nextUsername = "") {
  const oldHandle = normalize(member.username);
  const newHandle = nextUsername ? normalize(nextUsername) : oldHandle;
  const clean = { ...patch };
  if (nextUsername) clean.username = String(nextUsername).trim();

  if (member.source === "registered") {
    const record = { ...withoutSource(member), ...clean };
    if (newHandle !== oldHandle) {
      const created = await createRecord(REGISTERED_RECORDS_KEY, newHandle, record);
      if (!created) return { error: "That username is already taken." };
      await deleteRecord(REGISTERED_RECORDS_KEY, oldHandle);
    } else {
      await saveRecord(REGISTERED_RECORDS_KEY, newHandle, record);
    }
  } else {
    const overrides = await passwordOverrides();
    await saveRecord(OVERRIDES_RECORDS_KEY, oldHandle, { ...(overrides[oldHandle] || {}), ...clean });
  }

  return { saved: { ...member, ...clean } };
}

export async function updateMemberAccount(username, patch = {}) {
  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };

  const handle = normalize(member.username);
  const updatedAt = new Date().toISOString();
  const changes = {};
  const touched = new Set();

  if (patch.name !== undefined) {
    const issue = nameProblem(patch.name);
    if (issue) return { error: issue };
    changes.name = String(patch.name).trim();
    touched.add("name");
  }

  if (patch.phone !== undefined) {
    const issue = phoneProblem(patch.phone);
    if (issue) return { error: issue };
    changes.phone = String(patch.phone || "").trim();
    touched.add("phone");
  }

  if (patch.email !== undefined) {
    const address = normalizeEmail(patch.email);
    if (address !== normalizeEmail(member.email)) {
      if (member.emailVerified === true) {
        return {
          error: "Your email is confirmed, so it can no longer be changed.",
          code: "email_locked",
        };
      }
      const issue = emailProblem(address);
      if (issue) return { error: issue };
      const other = await findMemberByEmail(address);
      if (other && normalize(other.username) !== handle) {
        return { error: "That email address already belongs to an account." };
      }
      changes.email = address;
      changes.emailVerified = false;
      touched.add("email");
    }
  }

  let nextUsername = "";
  if (patch.username !== undefined && normalize(patch.username) !== handle) {
    const issue = usernameProblem(patch.username);
    if (issue) return { error: issue };
    if (await isUsernameTaken(patch.username)) return { error: "That username is already taken." };
    if (member.source !== "registered") {
      return { error: "Accounts listed in data/users.json can't be renamed." };
    }
    nextUsername = String(patch.username).trim();
    touched.add("username");
  }

  if (typeof patch.password === "string" && patch.password.length > 0) {
    if (member.provider === "google" || member.provider === "discord") {
      return { error: "This account signs in with Google or Discord, so it has no password." };
    }
    const issue = passwordProblem(patch.password, nextUsername || member.username);
    if (issue) return { error: issue };
    const salt = crypto.randomBytes(16).toString("hex");
    changes.salt = salt;
    changes.hash = hashPassword(patch.password, salt);
    touched.add("password");
  }

  if (touched.size === 0) return { member, unchanged: true };

  const limited =
    touched.has("name") || touched.has("phone") || touched.has("username") || touched.has("password");
  if (limited) {
    const window = profileChangeWindow(member);
    if (!window.canChange) {
      return {
        error: "Details, username and password can only be changed once every six months.",
        code: "locked",
        nextChangeAt: window.nextChangeAt,
      };
    }
    changes.profileUpdatedAt = updatedAt;
  }

  const write = await saveMemberRecord(member, { ...changes, updatedAt }, nextUsername);
  if (write.error) return { error: write.error };
  return { member: write.saved, renamed: Boolean(nextUsername) };
}

async function moveAdminAccess(from, to) {
  const key = normalizeUsername(from);
  const next = normalizeUsername(to);
  if (!key || !next || key === next) return;

  const [grants, owners] = await Promise.all([loadGrants(), loadOwners()]);
  let grantsChanged = false;
  let ownersChanged = false;

  if (grants[key]) {
    grants[next] = grants[key];
    delete grants[key];
    grantsChanged = true;
  }

  const nextOwners = owners.map((name) => {
    if (normalizeUsername(name) !== key) return name;
    ownersChanged = true;
    return to;
  });

  if (grantsChanged) await saveGrants(grants);
  if (ownersChanged) await saveOwners(nextOwners);
}

export async function adminUpdateMember(target, patch = {}) {
  const member = await findMember(target);
  if (!member) return { error: "No account with that username." };

  const handle = normalize(member.username);
  const updatedAt = new Date().toISOString();
  const changes = {};
  let nextUsername = "";

  if (patch.name !== undefined) {
    const issue = nameProblem(patch.name);
    if (issue) return { error: issue };
    changes.name = String(patch.name).trim();
  }

  if (patch.phone !== undefined) {
    const issue = phoneProblem(patch.phone);
    if (issue) return { error: issue };
    changes.phone = String(patch.phone || "").trim();
  }

  if (patch.email !== undefined) {
    const address = normalizeEmail(patch.email);
    if (address) {
      const issue = emailProblem(address);
      if (issue) return { error: issue };
      const other = await findMemberByEmail(address);
      if (other && normalize(other.username) !== handle) {
        return { error: "That email address already belongs to an account." };
      }
    }
    changes.email = address;
    changes.emailVerified = false;
  }

  if (patch.emailVerified !== undefined) {
    if (!changes.email && !member.email) {
      return { error: "Add an email address before marking it verified." };
    }
    changes.emailVerified = patch.emailVerified === true;
  }

  if (patch.username !== undefined && normalize(patch.username) !== handle) {
    const issue = usernameProblem(patch.username);
    if (issue) return { error: issue };
    if (await isUsernameTaken(patch.username)) return { error: "That username is already taken." };
    if (member.source !== "registered") {
      return { error: "Accounts listed in data/users.json can't be renamed." };
    }
    nextUsername = String(patch.username).trim();
  }

  if (typeof patch.password === "string" && patch.password.length > 0) {
    if (member.provider === "google" || member.provider === "discord") {
      return { error: "This account signs in with Google or Discord, so it has no password." };
    }
    const issue = passwordProblem(patch.password, nextUsername || member.username);
    if (issue) return { error: issue };
    const salt = crypto.randomBytes(16).toString("hex");
    changes.salt = salt;
    changes.hash = hashPassword(patch.password, salt);
  }

  if (Object.keys(changes).length === 0 && !nextUsername) {
    return { member, unchanged: true };
  }

  changes.updatedAt = updatedAt;
  const write = await saveMemberRecord(member, changes, nextUsername);
  if (write.error) return { error: write.error };
  if (nextUsername) await moveAdminAccess(member.username, nextUsername);
  return { member: write.saved, renamed: Boolean(nextUsername) };
}

export async function setMemberAvatar(username, dataUrl) {
  const problem = avatarProblem(dataUrl);
  if (problem) return { error: problem };

  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };

  const saved = await saveMemberPatch(member, {
    avatar: String(dataUrl),
    updatedAt: new Date().toISOString(),
  });

  return saved ? { member: saved } : { error: "No account with that username." };
}

export async function clearMemberAvatar(username) {
  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };

  const saved = await saveMemberPatch(member, {
    avatar: "",
    updatedAt: new Date().toISOString(),
  });

  return saved ? { member: saved } : { error: "No account with that username." };
}

export async function deleteMember(username, { keepHandle = false } = {}) {
  if (isRootOwner(username)) {
    return { error: "The super owner account can't be deleted." };
  }

  const member = await findMember(username);
  if (!member) return { error: "No account with that username." };

  const handle = normalize(username);

  if (member.source === "registered") {
    await deleteRecord(REGISTERED_RECORDS_KEY, handle);
    // A member who leaves keeps the handle. Their posts and ideas still carry
    // it, so letting someone else register it would hand them that history.
    if (keepHandle) {
      await saveRecord(DELETED_RECORDS_KEY, handle, {
        username: handle,
        hash: member.hash,
        deletedAt: new Date().toISOString(),
        selfDeleted: true,
      });
    }
  } else {
    await saveRecord(DELETED_RECORDS_KEY, handle, {
      username: handle,
      hash: member.hash,
      deletedAt: new Date().toISOString(),
    });
    await deleteRecord(OVERRIDES_RECORDS_KEY, handle);
  }

  return { member };
}

function signingSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

function sign(value) {
  return crypto.createHmac("sha256", signingSecret()).update(value).digest("hex");
}

function safeEqual(a = "", b = "") {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function revisionOf(member) {
  return member?.updatedAt || member?.createdAt || "v1";
}

export function createMemberToken(member) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: member.username,
      name: member.name || member.username,
      rev: revisionOf(member),
      expires: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function parseMemberToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.expires || data.expires < Date.now() || !data.sub) return null;
    return { sub: data.sub, name: data.name, rev: data.rev };
  } catch {
    return null;
  }
}

export function memberCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${MEMBER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearMemberCookieHeader() {
  return `${MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function memberFromCookieStore(store) {
  const jar = await store;
  const claims = parseMemberToken(jar?.get(MEMBER_COOKIE)?.value);
  if (!claims) return null;
  const member = await findMember(claims.sub);
  if (!member) return null;
  if (claims.rev !== undefined && claims.rev !== revisionOf(member)) return null;
  return publicMember(member);
}
