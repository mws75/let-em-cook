/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: jest.fn(async () => 42),
}));

jest.mock("@/lib/database", () => ({
  getDailyLogRange: jest.fn(),
}));

import * as db from "@/lib/database";

const url = (path: string) => `http://localhost:3000${path}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/daily-log/range", () => {
  it("returns 400 when start is missing", async () => {
    const res = await GET(
      new NextRequest(url("/api/daily-log/range?end=2026-04-30")),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when end is malformed", async () => {
    const res = await GET(
      new NextRequest(
        url("/api/daily-log/range?start=2026-04-01&end=garbage"),
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when start is after end", async () => {
    const res = await GET(
      new NextRequest(
        url("/api/daily-log/range?start=2026-05-01&end=2026-04-30"),
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when range exceeds 90 days", async () => {
    const res = await GET(
      new NextRequest(
        url("/api/daily-log/range?start=2026-01-01&end=2026-12-31"),
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns the logs for a valid range", async () => {
    const logs = [{ log_date: "2026-04-30", entries: [] }];
    (db.getDailyLogRange as jest.Mock).mockResolvedValueOnce(logs);

    const res = await GET(
      new NextRequest(
        url("/api/daily-log/range?start=2026-04-17&end=2026-04-30"),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ logs });
    expect(db.getDailyLogRange).toHaveBeenCalledWith(
      42,
      "2026-04-17",
      "2026-04-30",
    );
  });
});
