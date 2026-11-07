#!/usr/bin/env node
// Adds (or re-passwords) a site account in data/users.json.
//
//   npm run user:add -- <username> "<Full name>"
//
// You'll be prompted for the password without it being echoed, so it never
// lands in shell history. Only the salted scrypt hash is written to the file;
// commit and deploy for the change to reach production.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const file = path.join(process.cwd(), "data", "users.json");

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      if (["\n", "\r", "\u0004"].includes(String(char))) {
        process.stdin.removeListener("data", onData);
      } else {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    process.stdin.on("data", onData);
  });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

async function main() {
  const [username, ...nameParts] = process.argv.slice(2);
  if (!username) {
    console.error('Usage: npm run user:add -- <username> "<Full name>"');
    process.exit(1);
  }

  const password = await askHidden("Password: ");
  const confirm = await askHidden("Confirm password: ");
  if (!password || password !== confirm) {
    console.error("Passwords did not match (or were empty).");
    process.exit(1);
  }

  const data = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { users: [] };
  const users = Array.isArray(data.users) ? data.users : [];

  const salt = crypto.randomBytes(16).toString("hex");
  const entry = {
    username: username.trim(),
    name: nameParts.join(" ").trim() || username.trim(),
    salt,
    hash: hashPassword(password, salt),
    updatedAt: new Date().toISOString(),
  };

  const index = users.findIndex(
    (user) => String(user.username).toLowerCase() === entry.username.toLowerCase()
  );
  if (index === -1) users.push(entry);
  else users[index] = { ...users[index], ...entry };

  fs.writeFileSync(file, `${JSON.stringify({ ...data, users }, null, 2)}\n`);
  console.log(`${index === -1 ? "Added" : "Updated"} ${entry.username} in data/users.json`);
  console.log("Commit and redeploy for the change to take effect.");
}

main();
