import { Browser, Builder, By, type WebDriver } from "selenium-webdriver";
import { strict as assert } from "node:assert";

describe("App (Selenium E2E)", function () {
  let driver: WebDriver | undefined;

  this.timeout(60_000);

  before(async () => {
    driver = await new Builder().forBrowser(Browser.CHROME).build();
  });

  after(async () => {
    await driver?.quit();
  });

  it("GET /", async () => {
    if (!driver) throw new Error("WebDriver was not initialized");

    const baseURL =
      process.env.BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
    await driver.get(baseURL);

    const body = await driver.findElement(By.css("body")).getText();

    assert.equal(body, "Hello World!");
  });
});
