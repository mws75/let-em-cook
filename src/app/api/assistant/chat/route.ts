import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  getUserById,
  UnauthenticatedError,
} from "@/lib/auth";
import { enforceAiRateLimit, RateLimitError } from "@/lib/rateLimit";
import { getRecipes } from "@/lib/database/recipes";
import { buildRecipeContext } from "@/lib/assistant/recipeContext";
import { getDoInference, getDoInferenceModel } from "@/lib/doInference";
import { handleOpenAIError } from "@/lib/openai";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/prompts";

type ChatTurn = { role: "user" | "assistant"; content: string };

const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_TURNS = 10;

/** Keeps only well-formed prior user/assistant turns, capped in length. */
function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const t of raw) {
    if (
      t &&
      (t.role === "user" || t.role === "assistant") &&
      typeof t.content === "string" &&
      t.content.length <= MAX_MESSAGE_CHARS
    ) {
      turns.push({ role: t.role, content: t.content });
    }
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}

/**
 * Recipe assistant chat (Pro-only). Full-context: loads the user's entire
 * recipe library into the prompt and lets DigitalOcean inference reason over
 * it — no retrieval. See docs/RAG_Recipe_Assistant_Implementation_Guide.md.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    // Pro-gate (server-side). plan_tier is "pro" | "free".
    const user = await getUserById(userId);
    if (!user || user.plan_tier !== "pro") {
      return NextResponse.json(
        { error: "The recipe assistant is available on the Pro plan." },
        { status: 403 },
      );
    }

    await enforceAiRateLimit(userId, "assistant-chat");

    const body = await request.json().catch(() => null);
    const message: unknown = body?.message;
    if (typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
    const history = sanitizeHistory(body?.history);

    const recipes = await getRecipes(userId);
    if (recipes.length === 0) {
      return NextResponse.json(
        {
          answer:
            "You don't have any saved recipes yet. Add a few recipes and I can help you plan meals and hit your macros.",
        },
        { status: 200 },
      );
    }

    const context = buildRecipeContext(recipes);

    const completion = await getDoInference().chat.completions.create({
      model: getDoInferenceModel(),
      temperature: 0.3,
      messages: [
        { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
        {
          role: "system",
          content: `The user's saved recipes (JSON array):\n${context.json}`,
        },
        ...history,
        { role: "user", content: message },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a bit and try again." },
        { status: 429 },
      );
    }
    console.error("[assistant] chat failed:", error);
    const { message, status } = handleOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
