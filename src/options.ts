export const PRESETS = ["base", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export const CODE_QUALITY = ["biome", "eslint", "oxlint", "none"] as const;
export type CodeQuality = (typeof CODE_QUALITY)[number];

export const UNIT_TESTS = ["jest", "vitest", "mocha", "none"] as const;
export type UnitTests = (typeof UNIT_TESTS)[number];

// Prettier is shared by the eslint and oxlint paths
const CODE_QUALITY_OVERLAYS: Record<CodeQuality, string[]> = {
  biome: ["code-quality/biome"],
  eslint: ["code-quality/prettier", "code-quality/eslint"],
  oxlint: ["code-quality/prettier", "code-quality/oxlint"],
  none: [],
};

// Runners that ship their own eslint.config.mjs
const ESLINT_VARIANTS = new Set<UnitTests>(["jest", "vitest"]);

// Overlays apply in order, so later ones overwrite earlier files
export function overlaysFor(s: {
  codeQuality: CodeQuality;
  unitTests: UnitTests;
}): string[] {
  const overlays = [...CODE_QUALITY_OVERLAYS[s.codeQuality]];
  if (s.unitTests !== "none") {
    overlays.push("unit-tests/common", `unit-tests/${s.unitTests}`);
    if (s.codeQuality === "eslint" && ESLINT_VARIANTS.has(s.unitTests)) {
      overlays.push(`unit-tests/${s.unitTests}-eslint`);
    }
  }
  return overlays;
}
