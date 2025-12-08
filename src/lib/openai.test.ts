import OpenAI from "openai";
import { handleOpenAIError } from "./openai";

describe("handleOpenAIError", () => {
  it("should handle OpenAI.APIError correctly", () => {
    const apiError = new OpenAI.APIError(
      400,
      { error: { message: "Invalid request" } },
      "Invalid Request",
      {},
    );

    const result = handleOpenAIError(apiError);
    expect(result).toEqual({
      message: "Invalid request",
      status: 400,
    });
  });

  it("should handle generic Error Correctly", () => {
    const error = new Error("Something went wrong");

    const result = handleOpenAIError(error);

    expect(result).toEqual({
      message: "Something went wrong",
      status: 500,
    });
  });

  it("should handle unknown error types", () => {
    const result = new handleOpenAIError("string error");

    expect(result).toEqual({
      message: "An unexpected error occured",
      status: 500,
    });
  });
});
