import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { RECIPE_INGREDIENTS_CLASSIFIER_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    console.log("Successfully called API");
    const { ingredients_text } = await request.json();
    //Input Validation
    if (!ingredients_text || typeof ingredients_text !== "string") {
      console.log("ingredients_text is requred and must be a string");
      return NextResponse.json(
        { error: "Please enter your ingredients" },
        { status: 400 },
      );
    }

    if (ingredients_text.trim().length === 0) {
      console.log("ingredients cannot be empty");
      return NextResponse.json(
        { error: "Please enter at least one ingredient" },
        { status: 400 },
      );
    }

    if (ingredients_text.length > 10000) {
      return NextResponse.json(
        {
          error:
            "Your ingredients list is too long. Please keep it under 10,000 characters",
        },
        { status: 400 },
      );
    }

    console.log(`here are the ingredients: ${ingredients_text}`);

    // Call OpenAI API to check that the text is ingredients
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: RECIPE_INGREDIENTS_CLASSIFIER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Classify this text:\n\n ${ingredients_text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "We couldn't validate your ingredients. Please try again",
      );
    }

    const data = JSON.parse(content);
    const isIngredients: boolean = data.is_ingredients === true;

    return NextResponse.json({ isIngredients }, { status: 200 });
  } catch (error) {
    console.error(`unable to check-valid-ingredients ${error}`);

    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
