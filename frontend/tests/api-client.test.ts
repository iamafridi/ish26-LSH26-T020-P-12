import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api-client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the Firebase bearer token to authenticated requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/auth/me", { token: "test-token" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });
});
