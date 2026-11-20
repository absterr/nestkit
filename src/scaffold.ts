import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PackageManager } from "./package-managers.js";

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

  renameSync(path.join(target, "gitignore"), path.join(target, ".gitignore"));

  const pkgPath = path.join(target, "package.json");
  const pkg = readFileSync(pkgPath, "utf8").replaceAll(
    "{{projectName}}",
    projectName
  );
  writeFileSync(pkgPath, pkg);
}

export function applyOverlay(name: string, target: string): void {
  const dir = path.join(TEMPLATES, name);
  const fragment = path.join(dir, "package.json");
  cpSync(dir, target, { recursive: true, filter: (src) => src !== fragment });
  if (existsSync(fragment)) mergePackageJson(target, fragment);
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

export function insideGitRepo(target: string): boolean {
  let dir = target;
  while (!existsSync(dir)) dir = path.dirname(dir);
  return git(dir, "rev-parse", "--is-inside-work-tree");
}

export function initGit(cwd: string): boolean {
  return git(cwd, "init");
}
