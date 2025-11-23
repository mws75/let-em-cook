import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json();

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Invalid ingredients array" },
        { status: 400 }
      );
    }

    // Call OpenAI to sort ingredients by grocery store layout
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that organizes grocery lists in the order items would typically be found in a grocery store. Organize items by sections: Produce, Dairy, Meat/Seafood, Bakery, Canned Goods, Pasta/Grains, Frozen Foods, Condiments/Sauces, Spices/Baking, and Other. Return ONLY a JSON array of the sorted ingredient strings, no additional text or explanation.",
        },
        {
          role: "user",
          content: `Sort this grocery list in the order items would be found in a typical grocery store: ${JSON.stringify(ingredients)}`,
        },
      ],
      temperature: 0.3,
    });

    const sortedContent = completion.choices[0]?.message?.content;

    if (!sortedContent) {
      return NextResponse.json(
        { error: "Failed to get response from OpenAI" },
        { status: 500 }
      );
    }

    // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
    let cleanedContent = sortedContent.trim();
    if (cleanedContent.startsWith("```")) {
      // Remove opening ```json or ```
      cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, "");
      // Remove closing ```
      cleanedContent = cleanedContent.replace(/\n?```$/, "");
    }

    // Parse the JSON response
    const sortedIngredients = JSON.parse(cleanedContent.trim());

    return NextResponse.json({ sortedIngredients });
  } catch (error) {
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
