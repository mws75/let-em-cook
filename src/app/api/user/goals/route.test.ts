/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET, PUT } from "./route";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: jest.fn(async () => 42),
}));

jest.mock("@/lib/database", () => ({
  getUserMacroGoals: jest.fn(),
  updateUserMacroGoals: jest.fn(),
}));

import * as db from "@/lib/database";

const url = (path: string) => `http://localhost:3000${path}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/user/goals", () => {
  it("returns the user's goals", async () => {
    const goals = {
      calories: 2000,
      protein_g: 150,
      fat_g: 65,
      carbs_g: 220,
    };
    (db.getUserMacroGoals as jest.Mock).mockResolvedValueOnce(goals);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ goals });
    expect(db.getUserMacroGoals).toHaveBeenCalledWith(42);
  });
});

describe("PUT /api/user/goals", () => {
  it("normalizes empty strings to null", async () => {
    (db.updateUserMacroGoals as jest.Mock).mockResolvedValueOnce(undefined);
    const req = new NextRequest(url("/api/user/goals"), {
      method: "PUT",
      body: JSON.stringify({
        calories: 2000,
        protein_g: "",
        fat_g: null,
        carbs_g: 220,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(db.updateUserMacroGoals).toHaveBeenCalledWith(42, {
      calories: 2000,
      protein_g: null,
      fat_g: null,
      carbs_g: 220,
    });
  });

  it("rounds floats to integers", async () => {
    (db.updateUserMacroGoals as jest.Mock).mockResolvedValueOnce(undefined);
    const req = new NextRequest(url("/api/user/goals"), {
      method: "PUT",
      body: JSON.stringify({
        calories: 1999.6,
        protein_g: 150.4,
        fat_g: 65,
        carbs_g: 220,
      }),
    });

    await PUT(req);
    expect(db.updateUserMacroGoals).toHaveBeenCalledWith(42, {
      calories: 2000,
      protein_g: 150,
      fat_g: 65,
      carbs_g: 220,
    });
  });

  it("returns 400 on a negative goal", async () => {
    const req = new NextRequest(url("/api/user/goals"), {
      method: "PUT",
      body: JSON.stringify({
        calories: -100,
        protein_g: 150,
        fat_g: 65,
        carbs_g: 220,
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    expect(db.updateUserMacroGoals).not.toHaveBeenCalled();
  });
});
