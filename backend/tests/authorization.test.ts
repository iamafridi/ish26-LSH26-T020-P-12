import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("protected API routes", () => {
  it.each([
    ["GET", "/api/v1/auth/me"],
    ["GET", "/api/v1/salaries/2026-04"],
    ["GET", "/api/v1/expenses?month=2026-04"],
    ["GET", "/api/v1/dashboard?month=2026-04"],
    ["GET", "/api/v1/savings-pockets"],
  ])("rejects unauthenticated %s %s", async (method, path) => {
    const response = await request(createApp())[method.toLowerCase() as "get"](path);
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
  });
});
