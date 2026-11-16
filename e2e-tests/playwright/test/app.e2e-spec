import { expect, test } from "@playwright/test";

test("GET /", async ({ request }) => {
  const response = await request.get("/");

  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("Hello World!");
});
