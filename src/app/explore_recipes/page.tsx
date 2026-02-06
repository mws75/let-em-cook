"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Recipe,
  SubscriptionInfo,
} from "@/types/types";

// TODO
// Features
// 1. Click on Recipe Card and open []
// 2. Create recipe card for this page that doesn't have delete button []
// 3. User can add recipe to their recipes []
// 4. Back button []
// 5. Check that user can add based on subscription []
// 6. Allow user to subscribe []

export default function ExploreRecipes() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/signin");
      return;
    }

    const fetchRecipes = async () => {
      try {
        setIsLoadingRecipes(true);
        setError(null);
        // TODO: Implement fetch logic
      } catch (err) {
        setError("Failed to load recipes");
      } finally {
        setIsLoadingRecipes(false);
      }
    };

    fetchRecipes();
  }, [isLoaded, user, router]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Explore Recipes</h1>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
