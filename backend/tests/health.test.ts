import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("health endpoint", () => {
  it("reports that the API is available", async () => {
    const response = await request(createApp()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        service: "personal-ledger-api",
        status: "ok",
      },
    });
  });

  it("returns a safe response for unknown routes", async () => {
    const response = await request(createApp()).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route GET /api/v1/unknown was not found.",
      },
    });
  });
});
