import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";

const MAX_RECIPE_LENGTH = 20_000;

export async function POST(request: NextRequest) {
  try {
    // convert request to json

    const { recipe_text } = await request.json();
    // check input data is good
    if (
      !recipe_text ||
      typeof recipe_text !== "string" ||
      recipe_text.trim().length < 1
    ) {
      return NextResponse.json(
        {
          error: "Recipe is not a valid input, please try again",
        },
        { status: 400 },
      );
    }

    if (recipe_text.trim().length > MAX_RECIPE_LENGTH) {
      return NextResponse.json(
        {
          error:
            "Recipe length is too long, max number of characters is 20,000",
        },
        { status: 400 },
      );
    }

    // make open AI request
    // check the response
    // return response as json object
  } catch (error) {
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
