# NOTES

Roadmap and design notes for nestkit. These are ideas and open questions, not commitments. Contribution rules live in `CONTRIBUTING.md`.

Status labels: **Decided**, **Open**, **Unverified** (stated from reading or memory, not tested).

## Where things stand

Shipped in 0.1.0: Nest 11 and 12, CJS/ESM, presets (base, recommended, previous, custom), Biome / ESLint / oxlint, Jest / Vitest / Mocha, Supertest / Playwright / Cypress / Selenium, env validation (Joi, class-validator, Zod, Valibot, ArkType, vanilla), agent files (`AGENTS.md`, `CLAUDE.md`).

nestkit is a scaffolder. Generated projects keep `@nestjs/cli`, so `nest build`, `start` and `generate` already work in them.

## Priorities

Highest first.

### 1. Database and ORM step

New prompt category before environment.

- **Open:** which ORMs and drivers to offer, and how a choice interacts with the env templates (for example a `DATABASE_URL` entry in every validator's schema).
- First-party Nest packages exist for TypeORM, Drizzle, Mongoose and Sequelize. `@nestjs/drizzle` is very new (0.x). Peer ranges differ per package, so availability probably needs gating by Nest major, like runners today. **Unverified** per package.
- Drivers with install scripts (native drivers) must be added to `BUILD_SCRIPT_PACKAGES` in `src/scaffold.ts`, or pnpm installs fail and bun warns.
- A choice that needs a running database affects the e2e templates. Not yet looked at.

### 2. State file and project commands

`nestkit add`, `list`, `remove`, and possibly `init`. Their behavior could be controlled by a nestkit state or config file.

**State file**

- Written by `nestkit new`. Records the Nest version, module system and chosen options (code quality, unit tests, e2e, runner, env, and later database). Carries a `formatVersion` from day one. Does not store the package manager.
- **Open:** file name and location. User-level settings already exist at `~/.nestkit/settings.json` (used by the `previous` preset). That is a separate concern from a per-project state file.

**Package manager:** detect from the lockfile in the project root: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`.

**Projects without a state file:** unsupported. Commands stop with "no nestkit state file found". Guessing from `package.json` is too fragile. A later `nestkit init` could detect a project, ask for confirmation and write the file.

**Drift:** package manager commands can't be intercepted, so check at use time.

- Each option defines markers: key packages in `package.json` and key files (for example Vitest: `vitest` in devDependencies and `vitest.config.mjs`).
- `list`, `add` and `remove` compare the state file with `package.json` and disk, and report drift both ways.
- **Open:** per command, whether drift blocks or only warns.

**Option conflicts:** needs a rule per category (replace, refuse or ask). Examples: a second unit test runner, switching code quality tools, adding e2e when a runner already exists.

**`remove`:** needs a record of every change `new` and `add` make: files created, `package.json` keys merged, `.gitignore` lines appended. Overwrites need the previous content or a reverse patch. Current overwrites: `environment/common` over `src/main.ts` and `src/app.module.ts`, and `unit-tests/common` over `nest-cli.json`.

### 3. Agent skills

`nest new --skills` installs the official skills through `npx @nestjs/skills@latest add --agent <all|agents|claude|cursor>`. nestkit currently only prints that command when agent files are on.

- Main problem: the skills target the latest Nest (12), so they may mislead on Nest 11 projects. **Unverified**, based on the owner's observation.
- A third-party package fetched at scaffold time, and a network step. The installer was never run by us.
- **Open:** an optional prompt gated to Nest 12, or keep only the printed hint.

### 4. Generators (`nestkit g controller task`)

- **Decided for now:** not built, since `nest generate` already works in generated projects. The notes below are for whoever revisits it.
- nest-cli behavior (read from `@nestjs/schematics` 12.0.16 and run with `@nestjs/cli` 12.0.15):
  - `nest g service users` always creates `src/users/` (`--flat` is false by default). A "folder if it exists" rule would be a deliberate deviation.
  - Registration looks for `<name>.module.ts` in the target folder, then walks up to the first `*.module.ts`, or a `main.ts` that declares `@Module`. If none is found it warns and registers nothing. This is why the base template keeps `app.module.ts` directly in `src/`.
  - Registration uses the TypeScript compiler API, so a generator would need `typescript` as a runtime dependency.
  - `--spec` is on unless `@nestjs/testing` is missing from `package.json`. Spec templates use jest-style globals and are not runner-aware.
  - `generateOptions` in `nest-cli.json` takes `flat`, `spec`, `specFileSuffix` and `baseDir`.

### 5. Version management

- **Decided:** keep the current design. Templates are bundled per Nest major. `retargetNest` rewrites Nest-owned ranges from `RANGES` in `src/versions.ts`. Carets let the package manager resolve minor and patch versions.
- **Removed from scope:** registry-based resolution, a compatibility metadata JSON, remote metadata, background update checks (`npx` and `bunx` already fetch the latest CLI), minor/exact selection, separate template packages.
- Later options, in order of fit:
  - **Release-coupled templates:** update templates and ranges as nestkit releases evolve, in the style of `create-vite` and `create-next-app`. Not every framework release needs a template change.
  - **Minor/exact selection:** keep templates by major and let exact versions adjust ranges only for verified lockstep packages. Packages such as `@nestjs/config` version independently. Needs compatibility research.
  - **Dist-tags for older majors** (for example `nest-11`): reduces main-line complexity but adds backport and security-fix obligations.
- The main cost is not resolving versions, it is verifying that the generated project works with them.

### 6. Other nest-cli features

Checked against `docs.nestjs.com/cli/usages` (commands: `new`, `generate`, `build`, `start`, `add`, `upgrade`, `deploy`, `info`).

- **Skip:** `build` and `start` (already in generated projects), monorepos and libraries, `deploy` (a Mau wrapper), `add` (installs Nest libraries and would clash with `nestkit add`), `upgrade` (nest-cli's v11 to v12 migration already exists).
- **Cheap:**
  - `nestkit info` for bug reports.
  - `--dry-run`. For `new` it needs a plan step before writing.
  - `--no-interactive` and a `CI` check. nestkit only checks for a TTY, so coding agents in a pseudo-terminal can hang on prompts.
  - `nestkit new .` and non-empty folders. nestkit fails on a non-empty folder. nest-cli keeps an existing `README.md` and `.gitignore` and lists conflicts first.
  - `--format` on generators (Prettier).
- **Medium:**
  - A compiler builder choice (`tsc`, `swc`, `rspack`; webpack is deprecated). Dependencies and config per builder are not verified.
  - A `--minimal` preset, a one-file ESM project with `AGENTS.md`.
  - Observe (`@nestjs/observe`): a vendor product, skipped unless wanted.

## Constraints to remember

- **Build scripts:** pnpm 10+ and bun skip dependency install scripts. `BUILD_SCRIPT_PACKAGES` in `src/scaffold.ts` feeds both `approveBuildScripts` (pnpm) and `trustBuildScripts` (bun). New dependencies with install scripts must be added there.
- **Template checker:** `scripts/check-templates.mjs` must be given every new `overlaysFor` field, or new overlays show up as orphaned. It currently expects 46 overlays and three overwrites.
- **Package.json fragments:** object keys merge, arrays are replaced. Do not rely on two overlays contributing to the same array.
- **ESM-only dependencies:** ArkType is gated to ESM. Check module format and Jest compatibility before adding any validator or library.
- **Nest 11 vs 12 peers:** the latest release of many `@nestjs/*` packages peers only on Nest 12. Verify the `peerDependencies` range before listing or depending on one.
- **Layout:** `src/` is flat on purpose (see Generators).

## Smaller items

- Remove Joi in a future version and replace it with another validator.
- Standard Schema request validation as an option (Nest 12 has `StandardSchemaValidationPipe`; **Unverified** on Nest 11).
- Drop unused devDependencies from base `package.json`: ts-loader (unsure, possibly used by nest-cli), ts-node, and tsconfig-paths
- Merge the three near-identical ESLint config templates.
- Rejected for now: TypeBox, AJV, Typia (Typia needs a compiler transform and would touch every runner's config).

## Open decisions

- Default module system: CJS in base and custom paths even for Nest 12 (only `recommended` picks ESM).
- Contents of the state file, its name and location, conflict rules per category, drift behavior per command.
- Whether skills become a prompt.
- Revisit Jest on Nest 12 when the Node floor reaches 24.9 (date **Unverified**).

## Unverified

Yarn (Berry especially), pnpm 10 and 12, Windows terminals, `bunx @absterr/nestkit` from the registry, Selenium end to end, ArkType under Vitest and Mocha, user-added tsconfig `paths` under ESM, Jest on Node 24.9+.
