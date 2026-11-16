/**
 * @jest-environment node
 */
import OpenAI from "openai";
import { handleOpenAIError } from "./openai";
import { UnauthenticatedError } from "./auth";
import { UserFacingError } from "./errors";

describe("handleOpenAIError", () => {
  beforeEach(() => {
    // handleOpenAIError logs every non-auth error; keep test output clean.
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should pass through an OpenAI.APIError's message and status", () => {
    // openai v6 requires a real Headers instance (it calls headers.get()).
    const apiError = new OpenAI.APIError(
      400,
      { message: "Invalid request" },
      undefined,
      new Headers(),
    );

    const result = handleOpenAIError(apiError);

    expect(result.status).toBe(400);
    expect(result.message).toContain("Invalid request");
  });

  it("should return 401 for an UnauthenticatedError without logging it", () => {
    const result = handleOpenAIError(new UnauthenticatedError());

    expect(result).toEqual({ message: "Not authenticated", status: 401 });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should pass through a UserFacingError's message and status", () => {
    expect(
      handleOpenAIError(new UserFacingError("Please try again")),
    ).toEqual({ message: "Please try again", status: 500 });

    expect(
      handleOpenAIError(new UserFacingError("Upstream unavailable", 502)),
    ).toEqual({ message: "Upstream unavailable", status: 502 });
  });

  it("should not expose a generic Error's message to the client", () => {
    // Internal errors (DB, parsing, etc.) get a generic message instead of
    // leaking details. Throw UserFacingError for messages meant for users.
    const result = handleOpenAIError(new Error("Something went wrong"));

    expect(result).toEqual({
      message: "An unexpected error occurred",
      status: 500,
    });
  });

  it("should handle unknown error types", () => {
    const result = handleOpenAIError("string error");

    expect(result).toEqual({
      message: "An unexpected error occurred",
      status: 500,
    });
  });
});
