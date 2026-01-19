"use client";

import { useState } from "react";
import { PRO_TIER_PRICE } from "@/types/types";

interface UpgradeButtonProps {
  className?: string;
}

export default function UpgradeButton({ className = "" }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

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
    <button
      onClick={handleUpgrade}
      disabled={isLoading}
      className={`w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 border-2 border-border rounded-3xl py-4 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 ${className}`}
    >
      <span className="text-xl font-bold text-text block">
        {isLoading ? "Loading..." : `Upgrade to Pro - $${PRO_TIER_PRICE}/mo`}
      </span>
      <span className="text-sm text-text-secondary block">
        Unlimited recipes
      </span>
    </button>
  );
}
