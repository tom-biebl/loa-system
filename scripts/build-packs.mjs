#!/usr/bin/env node
/**
 * Kompiliert alle Pack-Quellen unter `packs/sources/<pack>/*.json` zu
 * Foundry-LevelDB-Packs unter `packs/<pack>/`.
 *
 * Idempotent: bestehende Pack-Verzeichnisse werden überschrieben.
 * Wird im `npm run build` und im Release-Workflow aufgerufen.
 */
import { readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const sourcesRoot = resolve(root, "packs", "sources");
const packsRoot = resolve(root, "packs");

if (!existsSync(sourcesRoot)) {
  console.log("[packs] keine Quellen unter packs/sources — übersprungen.");
  process.exit(0);
}

const entries = await readdir(sourcesRoot, { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory());

if (dirs.length === 0) {
  console.log("[packs] keine Pack-Verzeichnisse in packs/sources gefunden.");
  process.exit(0);
}

for (const entry of dirs) {
  const src = resolve(sourcesRoot, entry.name);
  const out = resolve(packsRoot, entry.name);
  await mkdir(out, { recursive: true });
  console.log(`[packs] compile ${entry.name}: ${src} → ${out}`);
  await compilePack(src, out);
}
console.log(`[packs] ${dirs.length} Pack(s) kompiliert.`);
