import { readFileSync } from "node:fs";

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const memory = globalThis.__mickeyChanMemoryKv || (globalThis.__mickeyChanMemoryKv = new Map());
const { listRecords, readRecordsMap, saveRecord, deleteRecord, clearRecords } = await import(
  "@/lib/record-store"
);

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const stamp = (i) => new Date(2026, 0, 1, 0, 0, i).toISOString();
const usernameOf = (entry) => String(entry?.username || "").toLowerCase();
const deletionHandle = (entry) => String(typeof entry === "string" ? entry : entry?.username || "").toLowerCase();

const REGISTERED = ["members:registered", "members:registered:records"];
const OVERRIDES = ["members:overrides", "members:overrides:records"];
const DELETED = ["members:deleted", "members:deleted:records"];

memory.set(REGISTERED[0], [
  { username: "Seed One", createdAt: stamp(1) },
  { username: "seed-two", createdAt: stamp(2) },
  { username: "seed-three", createdAt: stamp(3) },
]);
const seeded = await listRecords(REGISTERED[0], REGISTERED[1], usernameOf);
check("legacy member array is read", seeded.length === 3, String(seeded.length));
check("legacy member array is migrated", !memory.has(REGISTERED[0]) && memory.has(REGISTERED[1]));
check("member fields are lowercased keys", Object.keys(memory.get(REGISTERED[1])).includes("seed-two"));

const burst = 25;
await Promise.all(
  Array.from({ length: burst }, (_, i) =>
    saveRecord(REGISTERED[1], `member-${i}`, { username: `member-${i}`, createdAt: stamp(10 + i) })
  )
);
const afterBurst = await listRecords(REGISTERED[0], REGISTERED[1], usernameOf);
check(`${burst} concurrent sign-ups all survive`, afterBurst.length === burst + 3, String(afterBurst.length));

await saveRecord(REGISTERED[1], "member-4", { username: "member-4", emailVerified: true });
const afterEdit = await listRecords(REGISTERED[0], REGISTERED[1], usernameOf);
check(
  "editing one member leaves the rest intact",
  afterEdit.length === burst + 3 &&
    afterEdit.find((m) => usernameOf(m) === "member-4").emailVerified === true,
  String(afterEdit.length)
);

await deleteRecord(REGISTERED[1], "member-5");
const afterDelete = await listRecords(REGISTERED[0], REGISTERED[1], usernameOf);
check(
  "deleting one member removes only that member",
  afterDelete.length === burst + 2 && !afterDelete.some((m) => usernameOf(m) === "member-5"),
  String(afterDelete.length)
);

memory.set(OVERRIDES[0], {
  "seed-one": { email: "one@example.com", emailVerified: true },
  "seed-two": { email: "two@example.com" },
});
const overrides = await readRecordsMap(OVERRIDES[0], OVERRIDES[1]);
check("legacy overrides are read", Object.keys(overrides).length === 2, String(Object.keys(overrides).length));
check("legacy overrides are migrated", !memory.has(OVERRIDES[0]) && memory.has(OVERRIDES[1]));

await Promise.all(
  Array.from({ length: burst }, (_, i) =>
    saveRecord(OVERRIDES[1], `member-${i}`, { email: `member-${i}@example.com` })
  )
);
const afterOverrideBurst = await readRecordsMap(OVERRIDES[0], OVERRIDES[1]);
check(
  `${burst} concurrent override writes all survive`,
  Object.keys(afterOverrideBurst).length === burst + 2,
  String(Object.keys(afterOverrideBurst).length)
);
await deleteRecord(OVERRIDES[1], "member-6");
check(
  "removing one override leaves the rest",
  Object.keys(await readRecordsMap(OVERRIDES[0], OVERRIDES[1])).length === burst + 1
);

memory.set(DELETED[0], ["gone-one", { username: "gone-two", hash: "abc", deletedAt: stamp(1) }]);
const tombstones = await listRecords(DELETED[0], DELETED[1], deletionHandle);
check("legacy deletion tombstones are read", tombstones.length === 2, String(tombstones.length));
await Promise.all(
  Array.from({ length: burst }, (_, i) => saveRecord(DELETED[1], `gone-${i}`, { username: `gone-${i}` }))
);
check(
  `${burst} concurrent deletions all survive`,
  (await listRecords(DELETED[0], DELETED[1], deletionHandle)).length === burst + 2
);

await clearRecords(REGISTERED[1], REGISTERED[0]);
check("clearing members empties the store", (await listRecords(REGISTERED[0], REGISTERED[1])).length === 0);

const source = readFileSync(new URL("../lib/members.js", import.meta.url), "utf8");
check("member registry no longer writes whole values", !/kvSet\(/.test(source));
check(
  "member registry reads through the record store",
  /listRecords\(REGISTERED_KEY/.test(source) && /readRecordsMap\(OVERRIDES_KEY/.test(source)
);

const members = await import("@/lib/members");

const signUps = Array.from({ length: burst }, (_, i) => `signup-${i}`);
await Promise.all(
  signUps.map((username) =>
    members.registerMember({
      username,
      name: username,
      password: "Br1sk-Quartz-Meadow-91",
      allowSharedIp: true,
    })
  )
);
const afterSignUps = await members.listMembers();
check(
  `${burst} concurrent sign-ups through registerMember all survive`,
  signUps.every((name) => afterSignUps.some((member) => member.username === name)),
  String(afterSignUps.filter((member) => member.username.startsWith("signup-")).length)
);

const changed = await members.setMemberPassword("signup-3", "Velvet-Harbor-Tempo-42");
check("password change succeeds", !changed.error, changed.error || "");
check(
  "changed password verifies",
  members.verifyMemberPassword(await members.findMember("signup-3"), "Velvet-Harbor-Tempo-42")
);
check(
  "other members keep their password",
  members.verifyMemberPassword(await members.findMember("signup-4"), "Br1sk-Quartz-Meadow-91")
);

const removed = await members.deleteMember("signup-5");
check("registered member delete succeeds", !removed.error, removed.error || "");
check("deleted member is gone", (await members.findMember("signup-5")) === null);
check(
  "other members survive the delete",
  (await members.listMembers()).filter((member) => member.username.startsWith("signup-")).length ===
    burst - 1
);

const seedName = JSON.parse(readFileSync(new URL("../data/users.json", import.meta.url), "utf8"))
  .users[0].username;
await members.markEmailVerified(seedName);
check("file member override is stored", (await members.findMember(seedName)).emailVerified === true);
const seedRemoved = await members.deleteMember(seedName);
check("file member delete succeeds", !seedRemoved.error, seedRemoved.error || "");
check("deleted file member is tombstoned", (await members.isUsernameTaken(seedName)) === true);
check("tombstoned file member is gone", (await members.findMember(seedName)) === null);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `${failed} FAILED` : `${results.length}/${results.length} passed`);
process.exit(failed ? 1 : 0);
