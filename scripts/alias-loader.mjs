import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (!specifier.startsWith("@/")) return next(specifier, context);
  const path = specifier.slice(2);
  if (path.endsWith(".json")) return next(`${root}${path}`, context);
  return next(`${root}${path}${path.endsWith(".js") ? "" : ".js"}`, context);
}

export async function load(url, context, next) {
  if (!url.endsWith(".json")) return next(url, context);
  return { format: "json", source: await readFile(new URL(url), "utf8"), shortCircuit: true };
}
