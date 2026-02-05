"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { RecipeCard } from "@components/RecipeCard";
import {
  Recipe,
  SubscriptionInfo,
  FREE_TIER_RECIPE_LIMIT,
} from "@/types/types",

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
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null> ();
  const [showUpgradePrompt, setShowUpgradePrompt = useState(false);  

  useEffect(() => {
    if(!isLoaded) return;
    if(!user) {
      router.push("/siginin");
      return
    }

    const fetchRecipes = async () => {
      try{ 
        setIsLoadingRecipes(true);
        setError(null);
        const response await fetch(
    } 
  }

}
