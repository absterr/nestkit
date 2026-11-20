import { Browser, Builder, By, type WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("App (Selenium E2E)", () => {
  let driver: WebDriver | undefined;

  beforeAll(async () => {
    driver = await new Builder().forBrowser(Browser.CHROME).build();
  }, 60_000);

  afterAll(async () => {
    await driver?.quit();
  });

  it("GET /", async () => {
    if (!driver) throw new Error("WebDriver was not initialized");

    const baseURL =
      process.env.BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
    await driver.get(baseURL);

    const body = await driver.findElement(By.css("body")).getText();

    expect(body).toBe("Hello World!");
  });
});
