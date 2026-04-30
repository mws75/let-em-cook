/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: jest.fn(async () => 42),
}));

jest.mock("@/lib/database", () => ({
  getDailyLog: jest.fn(),
  upsertDailyLog: jest.fn(),
  deleteDailyLog: jest.fn(),
}));

import * as db from "@/lib/database";

const url = (path: string) => `http://localhost:3000${path}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/daily-log", () => {
  it("returns 400 when date param is missing", async () => {
    const res = await GET(new NextRequest(url("/api/daily-log")));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date param is malformed", async () => {
    const res = await GET(new NextRequest(url("/api/daily-log?date=not-a-date")));
    expect(res.status).toBe(400);
  });

  it("returns the log when one exists", async () => {
    const log = { log_date: "2026-04-30", entries: [] };
    (db.getDailyLog as jest.Mock).mockResolvedValueOnce(log);

    const res = await GET(new NextRequest(url("/api/daily-log?date=2026-04-30")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ log });
    expect(db.getDailyLog).toHaveBeenCalledWith(42, "2026-04-30");
  });

  it("returns null log when none exists", async () => {
    (db.getDailyLog as jest.Mock).mockResolvedValueOnce(null);
    const res = await GET(new NextRequest(url("/api/daily-log?date=2026-04-30")));
    expect(await res.json()).toEqual({ log: null });
  });
});

describe("PUT /api/daily-log", () => {
  it("returns 400 when log_date is missing", async () => {
    const req = new NextRequest(url("/api/daily-log"), {
      method: "PUT",
      body: JSON.stringify({ entries: [] }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when entries is not an array", async () => {
    const req = new NextRequest(url("/api/daily-log"), {
      method: "PUT",
      body: JSON.stringify({ log_date: "2026-04-30", entries: "nope" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("upserts the log on a valid request", async () => {
    (db.upsertDailyLog as jest.Mock).mockResolvedValueOnce(undefined);
    const req = new NextRequest(url("/api/daily-log"), {
      method: "PUT",
      body: JSON.stringify({
        log_date: "2026-04-30",
        entries: [],
        notes: "felt great",
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(db.upsertDailyLog).toHaveBeenCalledWith(42, {
      log_date: "2026-04-30",
      entries: [],
      notes: "felt great",
    });
  });
});

describe("DELETE /api/daily-log", () => {
  it("returns 400 when date param is malformed", async () => {
    const req = new NextRequest(url("/api/daily-log?date=bad"), {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("calls deleteDailyLog on a valid request", async () => {
    (db.deleteDailyLog as jest.Mock).mockResolvedValueOnce(undefined);
    const req = new NextRequest(url("/api/daily-log?date=2026-04-30"), {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(db.deleteDailyLog).toHaveBeenCalledWith(42, "2026-04-30");
  });
});
