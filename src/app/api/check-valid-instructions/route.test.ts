/**
 * @jest-environment node
 */
import { POST } from "./route";
import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { enforceAiRateLimit, RateLimitError } from "@/lib/rateLimit";

// The route authenticates and rate-limits before anything else. Mock both
// (no Clerk session or DB in tests) but keep the real error classes so the
// route's `instanceof` checks still work.
jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getAuthenticatedUserId: jest.fn().mockResolvedValue(1),
}));
jest.mock("@/lib/rateLimit", () => ({
  ...jest.requireActual("@/lib/rateLimit"),
  enforceAiRateLimit: jest.fn().mockResolvedValue(undefined),
}));

// Mock OpenAI to prevent real API requests
// Only the client is mocked; the real handleOpenAIError runs so tests cover
// which error messages actually reach users.
jest.mock("@/lib/openai", () => ({
  ...jest.requireActual("@/lib/openai"),
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

const URL = "http://localhost:3000/api/check-valid-instructions";

function makeRequest(body: unknown) {
  return new NextRequest(URL, { method: "POST", body: JSON.stringify(body) });
}

function mockClassification(content: object | null) {
  (openai.chat.completions.create as jest.Mock).mockResolvedValue({
    choices: [{ message: { content: content && JSON.stringify(content) } }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/check-valid-instructions - Input Validation", () => {
  it.each([
    ["missing", {}],
    ["a number", { instructions_text: 123 }],
    ["null", { instructions_text: null }],
    ["an array", { instructions_text: [] }],
    ["an empty string", { instructions_text: "" }],
  ])("should return 400 if instructions_text is %s", async (_label, body) => {
    const response = await POST(makeRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Please enter your cooking instructions" });
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("should return 400 if instructions_text is whitespace only", async () => {
    const response = await POST(makeRequest({ instructions_text: "   " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Please enter at least one instruction" });
  });

  it("should return 400 if instructions_text is > 10,000 characters", async () => {
    const response = await POST(
      makeRequest({ instructions_text: "a".repeat(10001) }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error:
        "Your instructions are too long. Please keep them under 10,000 characters",
    });
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/check-valid-instructions - Classification", () => {
  it("should return true for real cooking instructions", async () => {
    mockClassification({ is_instructions: true });

    const response = await POST(
      makeRequest({
        instructions_text:
          "1. Preheat oven to 350F. 2. Mix flour and butter. 3. Bake 20 minutes.",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ isInstructions: true });
  });

  it("should return false for text that isn't instructions", async () => {
    mockClassification({ is_instructions: false });

    const response = await POST(
      makeRequest({ instructions_text: "I like to read books" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ isInstructions: false });
  });

  it("should treat a non-boolean is_instructions as false", async () => {
    mockClassification({ is_instructions: "yes" });

    const response = await POST(makeRequest({ instructions_text: "Stir." }));
    const data = await response.json();

    expect(data).toEqual({ isInstructions: false });
  });

  it("should show the user-facing message when OpenAI returns no content", async () => {
    mockClassification(null);

    const response = await POST(makeRequest({ instructions_text: "Stir." }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "We couldn't validate your instructions. Please try again",
    );
  });

  it("should hide internal error details from the user", async () => {
    (openai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: "not json {" } }],
    });

    const response = await POST(makeRequest({ instructions_text: "Stir." }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("An unexpected error occurred");
  });
});

describe("POST /api/check-valid-instructions - Auth and Rate Limiting", () => {
  it("should return 401 and not call OpenAI when not signed in", async () => {
    (getAuthenticatedUserId as jest.Mock).mockRejectedValueOnce(
      new UnauthenticatedError(),
    );

    const response = await POST(makeRequest({ instructions_text: "Stir." }));

    expect(response.status).toBe(401);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("should return 429 and not call OpenAI when rate limited", async () => {
    (enforceAiRateLimit as jest.Mock).mockRejectedValueOnce(
      new RateLimitError(60, 60),
    );

    const response = await POST(makeRequest({ instructions_text: "Stir." }));

    expect(response.status).toBe(429);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("should rate limit under this endpoint's name", async () => {
    mockClassification({ is_instructions: true });

    await POST(makeRequest({ instructions_text: "Stir." }));

    expect(enforceAiRateLimit).toHaveBeenCalledWith(1, "check-valid-instructions");
  });
});
