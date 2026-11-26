## Description

A [NestJS](https://nestjs.com) project scaffolded with [nestkit](https://www.npmjs.com/package/@absterr/nestkit).

## Project setup

```bash
{{pm}} install
```

## Compile and run

```bash
# development
{{pm}} run start

# watch mode
{{pm}} run start:dev

# production mode
{{pm}} run build
{{pm}} run start:prod
```

The port is set in `src/main.ts`. `package.json` lists every script. Depending on the options you chose when scaffolding, there are also scripts for linting and formatting.

## Run tests

Available if you chose them when scaffolding.

```bash
# unit tests
{{pm}} run test

# unit tests in watch mode
{{pm}} run test:watch

# e2e tests
{{pm}} run test:e2e
```

## Environment variables

If you added environment validation, variables are read from `.env.local` and then `.env`, and validated at startup. The schema is in `src/config/env/`.

## Project structure

```
src/
  main.ts            app entry point
  app.module.ts      root module
  app.controller.ts  sample controller
  app.service.ts     sample service
```

The options you chose add more files, such as `test/` for end-to-end tests.

## Adding code

The project includes the Nest CLI. Generate new elements with `{{exec}} nest generate`, for example `{{exec}} nest generate resource users`. It registers new elements in the closest module.

## Deployment

See the [NestJS deployment documentation](https://docs.nestjs.com/deployment) for the steps to run your app in production.

## Resources

- [NestJS documentation](https://docs.nestjs.com)
- [Discord channel](https://discord.gg/G7Qnnhy) for questions and support
- [Official video courses](https://courses.nestjs.com)
