/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => {
  class UnauthenticatedError extends Error {}
  return {
    getAuthenticatedUserId: jest.fn(async () => 42),
    UnauthenticatedError,
  };
});

jest.mock("@/lib/rateLimit", () => {
  class RateLimitError extends Error {
    constructor(
      public limit: number,
      public windowSeconds: number,
    ) {
      super("Rate limit exceeded");
    }
  }
  return { enforceFoodRateLimit: jest.fn(async () => {}), RateLimitError };
});

jest.mock("@/lib/foods/searchFoods", () => ({ searchFoods: jest.fn() }));

import { GET } from "./route";
import * as auth from "@/lib/auth";
import * as rl from "@/lib/rateLimit";
import { searchFoods } from "@/lib/foods/searchFoods";

const mockSearch = searchFoods as jest.Mock;
const url = (path: string) => `http://localhost:3000${path}`;

beforeEach(() => {
  jest.clearAllMocks();
  (auth.getAuthenticatedUserId as jest.Mock).mockResolvedValue(42);
});

describe("GET /api/foods/search", () => {
  it("returns an empty result set for queries under 2 chars without searching", async () => {
    const res = await GET(new NextRequest(url("/api/foods/search?q=a")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [],
      parsed: null,
      source: null,
      status: "empty",
    });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("returns search results for a valid query", async () => {
    const payload = {
      results: [{ source: "usda", external_id: "1", name: "Apple" }],
      parsed: { qty: 1, unit: null, grams: null, foodName: "apple", raw: "apple" },
      source: "usda",
      status: "ok",
    };
    mockSearch.mockResolvedValueOnce(payload);

    const res = await GET(new NextRequest(url("/api/foods/search?q=apple")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
    expect(rl.enforceFoodRateLimit).toHaveBeenCalledWith(42, "foods-search");
    expect(mockSearch).toHaveBeenCalledWith("apple", expect.anything());
  });

  it("returns 401 when unauthenticated", async () => {
    (auth.getAuthenticatedUserId as jest.Mock).mockRejectedValueOnce(
      new auth.UnauthenticatedError(),
    );
    const res = await GET(new NextRequest(url("/api/foods/search?q=apple")));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    (rl.enforceFoodRateLimit as jest.Mock).mockRejectedValueOnce(
      new rl.RateLimitError(120, 60),
    );
    const res = await GET(new NextRequest(url("/api/foods/search?q=apple")));
    expect(res.status).toBe(429);
  });

  it("returns 502 when the provider blows up", async () => {
    mockSearch.mockRejectedValueOnce(new Error("network"));
    const res = await GET(new NextRequest(url("/api/foods/search?q=apple")));
    expect(res.status).toBe(502);
  });
});
