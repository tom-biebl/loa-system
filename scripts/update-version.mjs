#!/usr/bin/env node
/**
 * Setzt die Version in system.json — entweder aus dem CLI-Argument oder aus
 * dem Git-Tag (Umgebungsvariable GITHUB_REF_NAME bzw. RELEASE_TAG, sonst
 * `git describe --tags --abbrev=0`).
 *
 * Lokal:  node scripts/update-version.mjs 0.2.0
 * CI:     node scripts/update-version.mjs (Tag aus GitHub-Aktion)
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const systemPath = resolve(root, "system.json");

const explicit = process.argv[2];
const fromEnv = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
let version = explicit ?? fromEnv;

if (!version) {
  try {
    version = execSync("git describe --tags --abbrev=0", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    /* ignore */
  }
}

if (!version) {
  console.error("Keine Version übergeben (Argument, RELEASE_TAG, GITHUB_REF_NAME oder Git-Tag).");
  process.exit(1);
}

const stripped = version.replace(/^v/, "");

const raw = readFileSync(systemPath, "utf8");
const data = JSON.parse(raw);
const previous = data.version;
data.version = stripped;

writeFileSync(systemPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log(`system.json: version ${previous} → ${stripped}`);
