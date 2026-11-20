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

export function insideGitRepo(target: string): boolean {
  let dir = target;
  while (!existsSync(dir)) dir = path.dirname(dir);
  return git(dir, "rev-parse", "--is-inside-work-tree");
}

export function initGit(cwd: string): boolean {
  return git(cwd, "init");
}

export function gitInstalled(): boolean {
  return git(process.cwd(), "--version");
}
