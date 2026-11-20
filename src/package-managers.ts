import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export async function detectInstalled(): Promise<PackageManager[]> {
  const results = await Promise.all(
    PACKAGE_MANAGERS.map(async (pm) => {
      try {
        await run(pm, ["--version"], {
          shell: process.platform === "win32",
          windowsHide: true,
        });
        return pm;
      } catch {
        return undefined;
      }
    })
  );
  return results.filter((pm) => pm !== undefined);
}

export function invokedBy(): PackageManager | undefined {
  const name = process.env.npm_config_user_agent?.split("/")[0];
  return PACKAGE_MANAGERS.find((pm) => pm === name);
}
