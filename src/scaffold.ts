import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NESTED_OVERLAYS } from "./options.js";
import type { PackageManager } from "./package-managers.js";
import { RANGES, type NestMajor } from "./versions.js";

const TEMPLATES = fileURLToPath(new URL("../templates", import.meta.url));

type Json = Record<string, any>;

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const sortKeys = (obj: Json): Json =>
  Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );

export function copyBase(target: string, projectName: string): void {
  cpSync(path.join(TEMPLATES, "base"), target, { recursive: true });

  // npm strips .gitignore from published packages, so it ships as "gitignore"
  for (const name of ["gitignore", "gitattributes"]) {
    renameSync(path.join(target, name), path.join(target, `.${name}`));
  }

  const pkgPath = path.join(target, "package.json");
  const pkg = readFileSync(pkgPath, "utf8").replaceAll(
    "{{projectName}}",
    projectName
  );
  writeFileSync(pkgPath, pkg);
}

// Copies the overlay's files, merges its package.json fragment and appends its gitignore
export function applyOverlay(name: string, target: string): void {
  const dir = path.join(TEMPLATES, name);
  const fragment = path.join(dir, "package.json");
  const ignore = path.join(dir, "gitignore");
  const nested = NESTED_OVERLAYS.map((n) => path.join(TEMPLATES, n)).filter(
    (n) => n.startsWith(dir + path.sep)
  );
  cpSync(dir, target, {
    recursive: true,
    filter: (src) =>
      src !== fragment && src !== ignore && !nested.includes(src),
  });
  if (existsSync(fragment)) mergePackageJson(target, fragment);
  if (existsSync(ignore)) {
    appendFileSync(
      path.join(target, ".gitignore"),
      readFileSync(ignore, "utf8")
    );
  }
}

function mergePackageJson(target: string, fragmentPath: string): void {
  const pkgPath = path.join(target, "package.json");
  const pkg: Json = JSON.parse(readFileSync(pkgPath, "utf8"));
  const fragment: Json = JSON.parse(readFileSync(fragmentPath, "utf8"));

  for (const [key, value] of Object.entries(fragment)) {
    pkg[key] = isObject(value) ? { ...pkg[key], ...value } : value;
  }
  for (const key of ["dependencies", "devDependencies"]) {
    if (pkg[key]) pkg[key] = sortKeys(pkg[key]);
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

// Templates are authored for Nest 11. Point the Nest-owned packages at the chosen major.
export function retargetNest(target: string, nest: NestMajor): void {
  const pkgPath = path.join(target, "package.json");
  const pkg: Json = JSON.parse(readFileSync(pkgPath, "utf8"));
  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(RANGES[nest])) {
      if (pkg[field]?.[name]) pkg[field][name] = range;
    }
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

// ESM needs explicit extensions on relative imports. Templates are written without them.
export function rewriteRelativeImports(target: string): void {
  for (const rel of readdirSync(target, {
    recursive: true,
    encoding: "utf8",
  })) {
    if (!rel.endsWith(".ts")) continue;
    const file = path.join(target, rel);
    const src = readFileSync(file, "utf8");
    const out = src
      .replace(/(\bfrom\s+")(\.{1,2}\/[^"]+?)(?<!\.js)"/g, '$1$2.js"')
      .replace(/from "supertest\/types"/g, 'from "supertest/types.js"');
    if (out !== src) writeFileSync(file, out);
  }
}

// TypeScript 6 loads only the @types packages listed in `types`.
export function addTsconfigTypes(target: string, types: string[]): void {
  const file = path.join(target, "tsconfig.json");
  const tsconfig: Json = JSON.parse(readFileSync(file, "utf8"));
  const current: string[] | undefined = tsconfig.compilerOptions?.types;
  if (!current || types.length === 0) return;
  tsconfig.compilerOptions.types = [...new Set([...current, ...types])];
  writeFileSync(file, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

export function install(pm: PackageManager, cwd: string): boolean {
  const result = spawnSync(pm, ["install"], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

const git = (cwd: string, ...args: string[]) =>
  spawnSync("git", args, { cwd, stdio: "ignore" }).status === 0;

export function gitInstalled(): boolean {
  return git(process.cwd(), "--version");
}

// The target may not exist yet, so check from its nearest existing parent
export function insideGitRepo(target: string): boolean {
  let dir = target;
  while (!existsSync(dir)) dir = path.dirname(dir);
  return git(dir, "rev-parse", "--is-inside-work-tree");
}

export function initGit(cwd: string): boolean {
  return git(cwd, "init");
}

// pnpm 10 and later skip dependency install scripts and fail the install unless approved
const BUILD_SCRIPT_PACKAGES = ["@swc/core", "cypress"];

export function pnpmMajor(cwd: string): number {
  const result = spawnSync("pnpm", ["--version"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return Number.parseInt(result.stdout, 10);
}

export function approveBuildScripts(target: string, major: number): void {
  const pkgPath = path.join(target, "package.json");
  const pkg: Json = JSON.parse(readFileSync(pkgPath, "utf8"));
  const needed = BUILD_SCRIPT_PACKAGES.filter(
    (name) => pkg.dependencies?.[name] || pkg.devDependencies?.[name]
  );
  if (needed.length === 0) return;

  if (major === 10) {
    pkg.pnpm = { ...pkg.pnpm, onlyBuiltDependencies: needed };
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  } else if (major >= 11) {
    const entries = needed.map((name) => `  "${name}": true`).join("\n");
    writeFileSync(
      path.join(target, "pnpm-workspace.yaml"),
      `allowBuilds:\n${entries}\n`
    );
  }
}
