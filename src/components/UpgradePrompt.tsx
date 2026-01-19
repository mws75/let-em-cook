"use client";

import { useState } from "react";
import { PRO_TIER_PRICE, FREE_TIER_RECIPE_LIMIT } from "@/types/types";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  recipeCount: number;
}

export default function UpgradePrompt({
  isOpen,
  onClose,
  recipeCount,
}: UpgradePromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error starting checkout:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-surface border-2 border-border p-8 rounded-3xl shadow-xl max-w-md mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4">
            <span role="img" aria-label="chef">
              👨‍🍳
            </span>
          </div>

          <h2 className="text-2xl font-bold text-text mb-2">
            You're Cooking Up a Storm!
          </h2>

          <p className="text-text-secondary mb-4">
            You've created{" "}
            <span className="font-bold text-primary">{recipeCount}</span> out of{" "}
            <span className="font-bold">{FREE_TIER_RECIPE_LIMIT}</span> free
            recipes.
          </p>

          <div className="bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-border rounded-2xl p-4 mb-6">
            <p className="text-lg font-bold text-text mb-1">
              Upgrade to Pro
            </p>
            <p className="text-3xl font-bold text-primary mb-1">
              ${PRO_TIER_PRICE}
              <span className="text-lg text-text-secondary">/month</span>
            </p>
            <p className="text-text-secondary text-sm">
              Unlimited recipes forever
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-muted hover:bg-muted/80 border-2 border-border rounded-xl font-semibold text-text transition-all"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 border-2 border-border rounded-xl font-bold text-text shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Upgrade Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
