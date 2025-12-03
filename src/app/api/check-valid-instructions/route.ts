import { NextRequest, NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openai";
import { RECIPE_INSTRUCTIONS_CLASSIFIER_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { instructions_text } = await request.json();

    //Input Validation
    if (!instructions_text || typeof instructions_text !== "string") {
      return NextResponse.json(
        { error: "Please enter your cooking instructions" },
        { status: 400 },
      );
    }

    if (instructions_text.trim().length === 0) {
      return NextResponse.json(
        { error: "Please enter at least one instruction" },
        { status: 400 },
      );
    }

    if (instructions_text.length > 10000) {
      return NextResponse.json(
        { error: "Your instructions are too long. Please keep them under 10,000 characters" },
        { status: 400 },
      );
    }

    console.log(`here are the instructions: ${instructions_text}`);
    // Call OpenAI API to check that the text is instructions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: RECIPE_INSTRUCTIONS_CLASSIFIER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Classify this text: ${instructions_text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("We couldn't validate your instructions. Please try again");
    }

    const data = JSON.parse(content);
    const isInstructions: boolean = data.is_instructions === true;

    return NextResponse.json({ isInstructions }, { status: 200 });
  } catch (error) {
    console.error(`unable to check-valid-instructions ${error}`);

    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
