import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { CREATE_RECIPE_PROMPT } from "@/lib/prompts";
import { getAuthenticatedUserId } from "@/lib/auth";
const MAX_RECIPE_LENGTH = 20_000;

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    // convert request to json
    const { recipeName, category, ingredients, instructions } =
      await request.json();
    // check input data is good
    if (
      typeof recipeName !== "string" ||
      typeof category !== "string" ||
      typeof ingredients !== "string" ||
      typeof instructions !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Recipe is not a valid input, please try again",
        },
        { status: 400 },
      );
    }

    if (
      !recipeName.trim() ||
      !category.trim() ||
      !ingredients.trim() ||
      !instructions.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "User input missing, make sure there are values for Recipe Name, Category, Instructions, and Ingredients",
        },
        { status: 400 },
      );
    }

    const fullText = `Recipe Name: ${recipeName}\nCategory: ${category}\n Ingredients: ${ingredients}\nInstructions ${instructions}`;

    if (fullText.trim().length > MAX_RECIPE_LENGTH) {
      return NextResponse.json(
        {
          error:
            "Recipe length is too long, max number of characters is 20,000",
        },
        { status: 400 },
      );
    }

    // make open AI request
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: CREATE_RECIPE_PROMPT,
        },
        {
          role: "user",
          content: `Convert the following recipe into the required JSON schema. Return ONLY valid JSON: \n\n ${fullText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2500,
    });
    // check the response
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("We could not create the recipe, please try again");
    }

    const data = JSON.parse(content);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid json object");
    }

    // Add user_id to the recipe data
    data.user_id = userId;

    console.log("api to create recipe json object as completed");
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
