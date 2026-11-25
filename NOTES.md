## Next version: `add`, `list`, `remove`, database and ORM

Order: generators first (`nestkit g ...`), then this, then the database and ORM step.

### State file

Written by `nestkit new`. Records the Nest version, module system and chosen options (code quality, unit tests, e2e, runner, env). Carries a `formatVersion` from day one so the format can change later. It does not store the package manager. File name and location are not decided.

### Package manager

Detected at runtime from the lockfile in the project root: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`. Verify the bun lockfile name (`bun.lock` vs the older `bun.lockb`) before building.

### Projects without a state file

Not supported. `add`, `list` and `remove` stop with "no nestkit state file found". Guessing the stack from `package.json` and config files is too fragile. A later `nestkit init` could detect a project, ask the user to confirm, and write the state file.

### Drift (user runs `bun add`, `pnpm add` or edits files by hand)

Package manager commands cannot be intercepted, so nestkit does not track them. It checks at use time instead:

- Each option defines markers: its key packages in `package.json` and its key files (for example Vitest: `vitest` in devDependencies and `vitest.config.mjs`).
- `list`, `add` and `remove` compare the state file against `package.json` and the files on disk, and report drift in both directions (recorded but missing, present but unrecorded).
- Per command, decide whether drift blocks the action or only warns.

### Option conflicts

Needs a rule per category: replace, refuse, or ask. Examples to settle: adding a second unit test runner, switching code quality tools, adding e2e when a runner already exists.

### `remove`

Needs a record of every change `add` and `new` make: files created, `package.json` keys merged, `.gitignore` lines appended. Overwrites need the previous content or a reverse patch to undo (current ones: `environment/common` over `src/main.ts` and `src/app/app.module.ts`, `unit-tests/common` over `nest-cli.json`).

### pnpm build approvals

`approveBuildScripts` in `src/scaffold.ts` only knows `@swc/core` and `cypress` (`BUILD_SCRIPT_PACKAGES`). Any template that adds a dependency with an install script (ORMs, native database drivers) must be added to that list, or pnpm installs will fail.

### Database and ORM step

New prompt category after environment. ORM and driver choices, and how they interact with the environment templates, are not decided.

### Open items

- State file name and location.
- Conflict rules per category.
- Drift behavior per command.
- Bun lockfile names.
