import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { EnvProvider } from "./config/env/env.provider";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvProvider);
  const PORT = env.get("PORT");
  await app.listen(PORT);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
