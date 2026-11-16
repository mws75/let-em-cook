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

// Mock OpenAI to prevent real API Requests
// https://jestjs.io/docs/mock-functions#mocking-modules
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

describe("POST /api/check-valid-ingredients - Input Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if ingredients_text is missing", async () => {
    // 1. Create a mock NextRequest
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
    // 2. Call your actual API Route
    const response = await POST(request);
    // 3. Parse the JSON Response
    const data = await response.json();
    // 4. Assert the result
    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter your ingredients",
    });
  });

  it("should return 400 if ingredients_text is a number", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: 123 }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter your ingredients",
    });
  });

  it("should return 400 if ingredients_text is null", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: null }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter your ingredients",
    });
  });

  it("should return 400 if ingredients_text is an array", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: [] }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter your ingredients",
    });
  });

  it("should return 400 if the ingredients_text is an empty string", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: "" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    // "" is falsy, so it's caught by the missing/not-a-string check before
    // the trimmed-empty check (which only whitespace reaches).
    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter your ingredients",
    });
  });

  it("should return 400 if ingredients_text is whitespace only", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: "   " }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter at least one ingredient",
    });
  });

  it("should return 400 if the ingredients_text is > 10,000 characters", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: "a".repeat(10001) }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error:
        "Your ingredients list is too long. Please keep it under 10,000 characters",
    });
  });
});

describe("POST /api/check-valid-ingredients - Successful Classification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // valid ingredients test
  it("should return true if given a text of valid ingredient", async () => {
    // 0. Make Mock Changes
    (openai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ is_ingredients: true }),
          },
        },
      ],
    });
    // 1. Create NextRequest
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({
          ingredients_text: "1 cup of flour, 1 tsp of salt, 1/2 cup of butter",
        }),
      },
    );
    // 2. Call API
    const response = await POST(request);
    // 3. Parse JSON
    const data = await response.json();
    // 4. Assert Results
    expect(response.status).toBe(200);
    expect(data.isIngredients).toBe(true);
  });

  // invalid ingredients test
  it("should return false because these are not ingredients", async () => {
    // 0. Make Mock Changes
    (openai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ is_ingredients: false }),
          },
        },
      ],
    });
    // 1. Create Request
    const request = new NextRequest(
      "http://localhost:3000/api/check-valid-ingredients",
      {
        method: "POST",
        body: JSON.stringify({ ingredients_text: "I like to read books" }),
      },
    );

    // 2. Call API
    const response = await POST(request);
    // 3. Convert to JSON
    const data = await response.json();
    // 4. Make Assertions
    expect(response.status).toBe(200);
    expect(data.isIngredients).toBe(false);
  });
});

describe("POST /api/check-valid-ingredients - Error Messages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const request = () =>
    new NextRequest("http://localhost:3000/api/check-valid-ingredients", {
      method: "POST",
      body: JSON.stringify({ ingredients_text: "1 cup of flour" }),
    });

  it("should show the user-facing message when OpenAI returns no content", async () => {
    (openai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "We couldn't validate your ingredients. Please try again",
    );
  });

  it("should hide internal error details from the user", async () => {
    (openai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: "not json {" } }],
    });

    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("An unexpected error occurred");
  });
});

describe("POST /api/check-valid-ingredients - Auth and Rate Limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validRequest = () =>
    new NextRequest("http://localhost:3000/api/check-valid-ingredients", {
      method: "POST",
      body: JSON.stringify({ ingredients_text: "1 cup of flour" }),
    });

  it("should return 401 and not call OpenAI when not signed in", async () => {
    (getAuthenticatedUserId as jest.Mock).mockRejectedValueOnce(
      new UnauthenticatedError(),
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(401);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("should return 429 and not call OpenAI when rate limited", async () => {
    (enforceAiRateLimit as jest.Mock).mockRejectedValueOnce(
      new RateLimitError(60, 60),
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(429);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it("should rate limit under this endpoint's name", async () => {
    (openai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ is_ingredients: true }) } }],
    });

    await POST(validRequest());

    expect(enforceAiRateLimit).toHaveBeenCalledWith(1, "check-valid-ingredients");
  });
});
