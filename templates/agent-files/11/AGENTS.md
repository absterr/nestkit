# AGENTS.md

## NestJS

This project uses NestJS 11. The documentation at https://docs.nestjs.com may describe a newer major, so verify APIs against the installed packages. https://docs.nestjs.com/llms.txt indexes it as markdown, one page per chapter.

Nest has first-party `@nestjs/*` packages for common needs (databases, configuration, queues, scheduling, caching, health checks, OpenAPI, rate limiting). Check them before adding another library or writing your own, and pick the release whose `peerDependencies` accept Nest 11, since the newest release of a package may require Nest 12.

## Validation

Use the validation library already in `package.json` (check before adding another). `ValidationPipe` works with `class-validator`.

## Project

- `src/main.ts` creates the app and listens on `PORT` (3000 by default).
- `src/app.module.ts` is the root module that imports the others. `AppController` and `AppService` are samples.
- The scripts in `package.json` are the source of truth for building, running, linting and testing. Use them instead of calling tools directly.
- Unit tests, if present, sit beside the code as `*.spec.ts`. End-to-end tests, if present, are in `test/`.
- If `package.json` has `"type": "module"`, relative imports end in `.js` and `__dirname` does not exist (use `import.meta.dirname`).
- Add new elements with `nest generate` (for example `nest g resource users`). It registers them in the closest module.

## Testing

Mocks use the test runner's own API (`vi.fn()` on Vitest, `jest.fn()` on Jest). When a task says how to test, follow it. When it says nothing, cover the behavior you change with focused tests rather than adding broad e2e suites.
