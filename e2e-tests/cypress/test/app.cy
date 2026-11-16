/// <reference types="cypress" />

describe("GET /", () => {
  it("returns Hello World!", () => {
    cy.request("/").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.eq("Hello World!");
    });
  });
});
