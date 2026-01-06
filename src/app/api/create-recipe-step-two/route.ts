import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { CALCULATE_MACROS } from "@/lib/prompts";

const MAX_JSON_CHARACTERS = 20_000;

export async function POST(request: NextRequest) {
  try {
    // convert request to json
    const { recipe } = await request.json();
    // check input data is good
    if (!recipe || typeof recipe !== "object") {
      return NextResponse.json(
        {
          error: "Object is not a valid Recipe object, please try again",
        },
        { status: 400 },
      );
    }

    if (
      !recipe.name ||
      !Array.isArray(recipe.ingredients_json) ||
      recipe.ingredients_json.length === 0 ||
      !Array.isArray(recipe.instructions_json) ||
      recipe.instructions_json.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required recipe fields (name, ingredients, instructions)",
        },
        { status: 400 },
      );
    }

    const recipe_text = JSON.stringify(recipe);
    if (recipe_text.trim().length > MAX_JSON_CHARACTERS) {
      return NextResponse.json(
        { error: "Object is greater than max number of characters" },
        { status: 400 },
      );
    }

    // make open AI request
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CALCULATE_MACROS },
        {
          role: "user",
          content: `add the macros into the required JSON schema.  Return ONLY valid JSON: \n\n ${recipe_text}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2500,
    });
    // check response
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        "We could not add macros to your recipe, please try again",
      );
    }
    // return response
    const data = JSON.parse(content);

    // Validate that macro fields were added
    if (
      typeof data.per_serving_calories !== "number" ||
      typeof data.per_serving_protein_g !== "number" ||
      typeof data.per_serving_fat_g !== "number" ||
      typeof data.per_serving_carbs_g !== "number" ||
      typeof data.per_serving_sugar_g !== "number"
    ) {
      throw new Error("OpenAI did not return valid macro data");
    }

    console.log("api added macros to recipe json object successfully");
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
