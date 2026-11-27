# nestkit

Scaffold NestJS projects with the stack you choose, in the spirit of `create-next-app`. Pick the Nest version, module system, linting, test tools and environment validation instead of accepting one fixed setup.

[![npm version](https://img.shields.io/npm/v/@absterr/nestkit.svg)](https://www.npmjs.com/package/@absterr/nestkit)
[![license](https://img.shields.io/npm/l/@absterr/nestkit.svg)](https://github.com/absterr/nestkit/blob/main/LICENSE)

## Prerequisites

- Node.js 22.12 or later

## Usage

- Run it without installing:

```bash
npx @absterr/nestkit new my-app
# or
bunx @absterr/nestkit new my-app
```

Or install it globally:

```bash
npm install -g @absterr/nestkit
nestkit new my-app
```

`nestkit create` is an alias for `nestkit new`. Generated projects include the Nest CLI, so you can still use `nest generate`.

## Presets

- **Base**: plain NestJS, no extras.
- **Recommended**: the defaults of `nest new` for the chosen Nest version.
- **Previous**: the choices from your last Custom run. Saved in `~/.nestkit/settings.json`.
- **Custom**: choose each tool yourself.

## Options

- **NestJS**: 11 or 12 (`--nest-version`)
- **Module system**: CommonJS or ESM
- **Linting and formatting**: Biome, ESLint + Prettier, Oxlint + Prettier
- **Unit tests**: Jest, Vitest, Mocha
- **End-to-end tests**: Supertest, Playwright, Cypress, Selenium
- **Environment validation**: Joi, class-validator, Zod, Valibot, ArkType, or plain TypeScript
- **Agent files**: `AGENTS.md` and `CLAUDE.md`
- **Git** initialization and **dependency install**

Jest is only offered for Nest 11 with CommonJS, and ArkType only with ESM.

## Non-interactive use

```bash
nestkit new my-app --preset recommended --pm npm --skip-git
nestkit new my-app --nest-version 12 --module-system esm \
  --code-quality oxlint --unit-tests vitest --e2e supertest --env zod
```

All flags: `--pm`, `--nest-version`, `--preset`, `--module-system`, `--code-quality`, `--unit-tests`, `--e2e`, `--e2e-runner`, `--env`, `--agent-files`, `--skip-agent-files`, `--git`, `--skip-git`, `--skip-install`.

## License

[MIT](https://github.com/absterr/nestkit/blob/main/LICENSE)
