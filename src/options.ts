export const PRESETS = ["base", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export const CODE_QUALITY = ["biome", "eslint", "oxlint", "none"] as const;
export type CodeQuality = (typeof CODE_QUALITY)[number];

// Template folders applied in order. Prettier is shared by eslint and oxlint.
export const CODE_QUALITY_OVERLAYS: Record<CodeQuality, string[]> = {
  biome: ["code-quality/biome"],
  eslint: ["code-quality/prettier", "code-quality/eslint"],
  oxlint: ["code-quality/prettier", "code-quality/oxlint"],
  none: [],
};
