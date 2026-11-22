export const NEST_VERSIONS = ["11", "12"] as const;
export type NestMajor = (typeof NEST_VERSIONS)[number];

export const LATEST: NestMajor = "12";
export const PREVIOUS: NestMajor = "11";

// Ranges for the packages whose versions follow the Nest major
export const RANGES: Record<NestMajor, Record<string, string>> = {
  "11": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/testing": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    typescript: "^5.7.3",
  },
  "12": {
    "@nestjs/common": "^12.0.1",
    "@nestjs/core": "^12.0.1",
    "@nestjs/platform-express": "^12.0.1",
    "@nestjs/testing": "^12.0.1",
    "@nestjs/config": "^12.1.1",
    "@nestjs/cli": "^12.0.0",
    "@nestjs/schematics": "^12.0.0",
    typescript: "~6.0.2",
  },
};

export function resolveNest(spec: string): NestMajor | undefined {
  if (spec === "latest") return LATEST;
  if (spec === "previous") return PREVIOUS;
  return NEST_VERSIONS.find((v) => v === spec);
}
