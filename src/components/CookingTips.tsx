"use client";
import React, { useState, useEffect, useRef } from "react";
import { cookingTips } from "@/data/cookingTips";

interface CookingTipsProps {
  isVisible: boolean;
}

export default function CookingTips({ isVisible }: CookingTipsProps) {
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * cookingTips.length),
  );
  const [isFading, setIsFading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Pick a new random starting tip each time it becomes visible
    setTipIndex(Math.floor(Math.random() * cookingTips.length));
    setIsFading(false);

    intervalRef.current = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % cookingTips.length);
        setIsFading(false);
      }, 300);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const currentTip = cookingTips[tipIndex];

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50">
      <div className="bg-surface border-2 border-border rounded-2xl shadow-lg p-5 flex items-start gap-4">
        {/* Spinner */}
        <div className="mt-1 shrink-0">
          <div className="w-6 h-6 border-3 border-border border-t-primary rounded-full animate-spin" />
        </div>
        {/* Tip content */}
        <div
          className="transition-opacity duration-300"
          style={{ opacity: isFading ? 0 : 1 }}
        >
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">
            Cooking Tip
          </p>
          <p className="text-text text-sm">
            <span className="mr-1">{currentTip.emoji}</span>
            {currentTip.tip}
          </p>
        </div>
      </div>
    </div>
  );
}
