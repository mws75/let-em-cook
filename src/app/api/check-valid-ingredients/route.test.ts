import { POST } from "./route";
import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";

// Mock OpenAI to prevent real API Requests
// https://jestjs.io/docs/mock-functions#mocking-modules
jest.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
  handleOpenAIError: jest.fn((error) => ({
    message: error.message || "An unexpected error occurred",
    status: 500,
  })),
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

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "Please enter at least one ingredient",
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
