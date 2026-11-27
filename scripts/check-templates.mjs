/**
 * Verifies every overlay the CLI can request exists, finds template files nothing
 * uses, and lists the base files that overlays overwrite. Run after `bun run build`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODE_QUALITY,
  E2E,
  ENV,
  MODULE_SYSTEMS,
  needsRunner,
  NESTED_OVERLAYS,
  overlaysFor,
  runnersFor,
  UNIT_TESTS,
} from "../dist/options.js";
import { NEST_VERSIONS, RANGES } from "../dist/versions.js";

const TEMPLATES = fileURLToPath(new URL("../templates", import.meta.url));
const abs = (name) => path.join(TEMPLATES, name);
const within = (file, dir) => file.startsWith(dir + path.sep);

const used = new Set(["base"]);
for (const nest of NEST_VERSIONS) {
  for (const moduleSystem of MODULE_SYSTEMS) {
    const runners = runnersFor(nest, moduleSystem);
    for (const codeQuality of CODE_QUALITY) {
      for (const unitTests of UNIT_TESTS) {
        if (unitTests !== "none" && !runners.includes(unitTests)) continue;
        for (const e2e of E2E) {
          for (const env of ENV) {
            const e2eRunners =
              needsRunner(e2e) && unitTests === "none" ? runners : [undefined];
            for (const e2eRunner of e2eRunners) {
              for (const o of overlaysFor({
                nest,
                moduleSystem,
                codeQuality,
                unitTests,
                e2e,
                e2eRunner,
                env,
                agentFiles: true,
              })) {
                used.add(o);
              }
            }
          }
        }
      }
    }
  }
}

const files = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));

const missing = [...used].filter((o) => !existsSync(abs(o)));
const usedAbs = [...used].filter((o) => existsSync(abs(o))).map(abs);
const nestedAbs = NESTED_OVERLAYS.map(abs);

// A file is covered when a used overlay contains it and no unused nested overlay does
const covered = (file) =>
  usedAbs.some(
    (u) =>
      within(file, u) &&
      !nestedAbs.some(
        (n) =>
          n !== u && within(file, n) && within(n, u) && !usedAbs.includes(n)
      )
  );
const orphans = files(TEMPLATES)
  .filter((f) => !covered(f))
  .map((f) => path.relative(TEMPLATES, f));

const baseFiles = new Set(
  files(abs("base")).map((f) => path.relative(abs("base"), f))
);
const overwrites = [];
for (const u of usedAbs) {
  if (u === abs("base")) continue;
  for (const f of files(u)) {
    if (nestedAbs.some((n) => n !== u && within(f, n))) continue;
    const rel = path.relative(u, f);
    if (rel === "package.json" || rel === "gitignore") continue;
    if (baseFiles.has(rel))
      overwrites.push(`${path.relative(TEMPLATES, u)} overwrites ${rel}`);
  }
}

// A "*" placeholder is only safe if every Nest major has a range for it
const unresolved = [];
for (const file of files(TEMPLATES).filter(
  (f) => path.basename(f) === "package.json"
)) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (range === "*" && NEST_VERSIONS.some((v) => !RANGES[v][name])) {
        unresolved.push(`${path.relative(TEMPLATES, file)}: ${name}`);
      }
    }
  }
}

console.log(`Overlays referenced by the CLI: ${used.size}`);
console.log(
  missing.length
    ? `\nMISSING (referenced but not on disk):\n  ${missing.sort().join("\n  ")}`
    : "\nMissing overlays: none"
);
console.log(
  orphans.length
    ? `\nORPHANED (not used by any option):\n  ${orphans.sort().join("\n  ")}`
    : "\nOrphaned files: none"
);
console.log(
  overwrites.length
    ? `\nOverlays overwriting base files (review):\n  ${[...new Set(overwrites)].sort().join("\n  ")}`
    : "\nOverwrites of base files: none"
);
console.log(
  unresolved.length
    ? `\nUNRESOLVED "*" (no range in RANGES):\n  ${unresolved.join("\n  ")}`
    : '\nUnresolved "*" placeholders: none'
);

process.exit(missing.length || orphans.length || unresolved.length ? 1 : 0);
