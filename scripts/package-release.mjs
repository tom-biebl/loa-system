#!/usr/bin/env node
/**
 * Erzeugt loa-system.zip mit allem, was Foundry braucht.
 * Verwendet die plattform-eigene zip-CLI (Linux/Mac) bzw. PowerShell auf Windows.
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = resolve(root, "loa-system.zip");

if (existsSync(out)) rmSync(out);

const include = ["system.json", "template.json", "dist", "styles", "templates", "packs"];

if (platform() === "win32") {
  const args = include.map((p) => `'${p}'`).join(",");
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${args} -DestinationPath '${out}' -Force"`, {
    cwd: root,
    stdio: "inherit",
  });
} else {
  execSync(`zip -r loa-system.zip ${include.join(" ")}`, { cwd: root, stdio: "inherit" });
}

console.log(`Built ${out}`);
