import Image from "next/image";
import LandingPage from "@/components/LandingPage";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLatestRecipesWithImages } from "@/lib/database/recipes";
import type { LandingRecipe } from "@/types/types";

export default async function Home() {
  const { userId } = await auth();

  //if user is signed in go to dashboard
  if (userId) {
    console.log("user is signed in..");
    redirect("/dashboard");
  } else {
    console.log("user IS NOT signed in..");
  }

  // The landing page should still render if this query fails
  let recipes: LandingRecipe[] = [];
  try {
    recipes = await getLatestRecipesWithImages(3);
  } catch (error) {
    console.error("Failed to fetch landing page recipes:", error);
  }

  return (
    <main>
      <LandingPage recipes={recipes} />
    </main>
  );
}
