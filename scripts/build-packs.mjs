#!/usr/bin/env node
/**
 * Kompiliert alle Pack-Quellen unter `packs/sources/<pack>/*.json` zu
 * Foundry-LevelDB-Packs unter `packs/<pack>/`.
 *
 * Sources brauchen `_id` — das `_key`-Feld wird hier automatisch aus dem
 * Document-Type abgeleitet (`!<collection>!<id>`), damit der Foundry-CLI
 * die Items nicht skipt.
 */
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const sourcesRoot = resolve(root, "packs", "sources");
const packsRoot = resolve(root, "packs");
const tmpRoot = resolve(packsRoot, ".build-tmp");

if (!existsSync(sourcesRoot)) {
  console.log("[packs] keine Quellen unter packs/sources — übersprungen.");
  process.exit(0);
}

const COLLECTION_BY_TYPE = {
  Actor: "actors",
  Item: "items",
  JournalEntry: "journal",
  RollTable: "tables",
  Scene: "scenes",
  Macro: "macros",
  Adventure: "adventures",
  Cards: "cards",
  Playlist: "playlists",
};

/**
 * Foundry Item-Subtypes, die eindeutig in die `items`-Collection gehören.
 * (Allows ein leichteres Mapping ohne explizit "Item" pro Datei zu deklarieren.)
 */
const ITEM_SUBTYPES = new Set([
  "weapon",
  "armor",
  "spell",
  "ability",
  "consumable",
  "equipment",
]);

const ACTOR_SUBTYPES = new Set(["character", "npc"]);

function inferCollection(doc) {
  // 1. Direkte Document-Type-Angabe (z.B. doc.documentType)
  if (doc.documentType && COLLECTION_BY_TYPE[doc.documentType]) {
    return COLLECTION_BY_TYPE[doc.documentType];
  }
  // 2. Aus type heuristisch ableiten
  if (typeof doc.type === "string") {
    if (ITEM_SUBTYPES.has(doc.type)) return "items";
    if (ACTOR_SUBTYPES.has(doc.type)) return "actors";
  }
  return "items"; // Default
}

async function preparePackTemp(packName, src) {
  const tmp = resolve(tmpRoot, packName);
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const files = await readdir(src);
  let count = 0;
  for (const file of files) {
    if (!file.endsWith(".json") && !file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const content = await readFile(resolve(src, file), "utf-8");
    const doc = JSON.parse(content);
    if (!doc._id) {
      console.warn(`[packs] WARN: ${packName}/${file} hat kein _id — übersprungen.`);
      continue;
    }
    if (!doc._key) {
      const collection = inferCollection(doc);
      doc._key = `!${collection}!${doc._id}`;
    }
    await writeFile(resolve(tmp, file), `${JSON.stringify(doc, null, 2)}\n`, "utf-8");
    count += 1;
  }
  return { tmp, count };
}

const entries = await readdir(sourcesRoot, { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory());

if (dirs.length === 0) {
  console.log("[packs] keine Pack-Verzeichnisse in packs/sources gefunden.");
  process.exit(0);
}

await rm(tmpRoot, { recursive: true, force: true });
let totalDocs = 0;
for (const entry of dirs) {
  const src = resolve(sourcesRoot, entry.name);
  const out = resolve(packsRoot, entry.name);
  // Vorhandenen LevelDB-Output wegwerfen, damit gelöschte Items nicht hängenbleiben.
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const { tmp, count } = await preparePackTemp(entry.name, src);
  console.log(`[packs] compile ${entry.name} (${count} docs): ${tmp} → ${out}`);
  await compilePack(tmp, out);
  totalDocs += count;
}
await rm(tmpRoot, { recursive: true, force: true });
console.log(`[packs] ${dirs.length} Pack(s), ${totalDocs} Item(s) kompiliert.`);
