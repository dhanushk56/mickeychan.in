#!/usr/bin/env node
/**
 * Flags the AI-writing tells listed in the human-voice skill.
 *
 *   node scripts/check-copy.mjs app/page.js components/JoinForm.js
 *
 * Blocked hits fail the run. Watch words only print, because most of them have
 * honest uses: "or underscore" in a username rule, "highlight" in an editor hint.
 */
import fs from "node:fs";

const BLOCKED_WORDS = [
  "additionally",
  "align with",
  "boasts",
  "bolster",
  "deep dive",
  "delve",
  "emphasiz",
  "enduring",
  "fostering",
  "garner",
  "interplay",
  "intricate",
  "intricacies",
  "meticulous",
  "pivotal",
  "robust",
  "showcas",
  "tapestry",
  "testament",
  "vibrant",
  "seamless",
  "leverage",
  "multifaceted",
  "nestled",
  "in the heart of",
  "groundbreaking",
  "diverse array",
  "serves as",
  "stands as",
  "plays a vital role",
  "leaves a lasting",
  "lasting impact",
  "ever-evolving",
  "ever changing",
  "active social media presence",
];

const WATCH_WORDS = ["crucial", "highlight", "landscape", "valuable", "enhanc", "foster", "quietly", "practical", "underscor"];

const RULES = [
  ["negative parallelism", /\bnot (just|only)\b[^.!?]{0,60}\bbut\b/i],
  ["negative parallelism", /\bit'?s not\b[^.!?]{0,50},\s*it'?s\b/i],
  ["negative parallelism", /\bisn'?t (just|only)\b/i],
  ["em dash", /\u2014/],
  ["curly quotes", /[\u201c\u201d\u2018\u2019]/],
];

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log("usage: node scripts/check-copy.mjs <file...>");
  process.exit(2);
}

let blocked = 0;
let watch = 0;

for (const file of files) {
  fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const lower = line.toLowerCase();
      const hits = [
        ...BLOCKED_WORDS.filter((word) => lower.includes(word)).map((word) => `blocked: ${word}`),
        ...WATCH_WORDS.filter((word) => lower.includes(word)).map((word) => `watch: ${word}`),
        ...RULES.filter(([, pattern]) => pattern.test(line)).map(([rule]) => rule),
      ];
      if (hits.length === 0) return;
      for (const hit of hits) {
        if (hit.startsWith("watch:")) watch += 1;
        else blocked += 1;
      }
      console.log(`${file}:${index + 1}: ${hits.join(", ")}`);
      console.log(`    ${line.trim().slice(0, 140)}`);
    });
}

if (blocked > 0) {
  console.log(`\n${blocked} blocked flag(s), ${watch} to review. Fix the copy, do not silence the check.`);
  process.exit(1);
}
console.log(watch > 0 ? `clean. ${watch} watch word(s) to judge by hand.` : "clean");
