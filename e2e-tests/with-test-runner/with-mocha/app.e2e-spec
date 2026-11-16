import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { after, before, describe, it } from "mocha";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  before(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it("GET /", async () => {
    await request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });
});
