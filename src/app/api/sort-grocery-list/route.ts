import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { aggregateIngredients } from "@/lib/ingredientAggregator";
import { formatQuantity } from "@/lib/unitConverter";
import { Ingredients, GroceryItem } from "@/types/types";

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json();

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        {
          error: "Please select at least one recipe to generate a grocery list",
        },
        { status: 400 },
      );
    }

    // Aggregate ingredients with unit conversion
    const aggregatedItems = aggregateIngredients(ingredients as Ingredients[]);

    // Format for OpenAI sorting (e.g., "2 cups flour")
    const formattedForSorting = aggregatedItems.map((item) => {
      if (item.quantity && item.unit) {
        return `${formatQuantity(item.quantity)} ${item.unit} ${item.displayName}`;
      } else if (item.quantity) {
        return `${formatQuantity(item.quantity)} ${item.displayName}`;
      }
      return item.displayName;
    });

    // Call OpenAI to sort ingredients by grocery store layout
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that organizes grocery lists in the order items would typically be found in a grocery store. Organize items by sections: Produce, Dairy, Meat/Seafood, Bakery, Canned Goods, Pasta/Grains, Frozen Foods, Condiments/Sauces, Spices/Baking, and Other. Return ONLY a JSON array of the sorted ingredient strings exactly as provided (do not modify the strings), no additional text or explanation.",
        },
        {
          role: "user",
          content: `Sort this grocery list in the order items would be found in a typical grocery store: ${JSON.stringify(formattedForSorting)}`,
        },
      ],
      temperature: 0.3,
    });

    const sortedContent = completion.choices[0]?.message?.content;

    if (!sortedContent) {
      return NextResponse.json(
        {
          error:
            "We couldn't generate your grocery list right now. Please try again",
        },
        { status: 500 },
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

    // Parse the sorted strings
    const sortedStrings: string[] = JSON.parse(cleanedContent.trim());

    // Map sorted strings back to GroceryItem objects
    const stringToItem = new Map<string, GroceryItem>();
    for (let i = 0; i < formattedForSorting.length; i++) {
      stringToItem.set(formattedForSorting[i], aggregatedItems[i]);
    }

    const groceryItems: GroceryItem[] = sortedStrings
      .map((str) => stringToItem.get(str))
      .filter((item): item is GroceryItem => item !== undefined);

    // If mapping failed (OpenAI modified strings), fall back to unsorted aggregated items
    if (groceryItems.length === 0) {
      return NextResponse.json({ groceryItems: aggregatedItems });
    }

    return NextResponse.json({ groceryItems });
  } catch (error) {
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
