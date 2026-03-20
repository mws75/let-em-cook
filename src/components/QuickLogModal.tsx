"use client";
import { useState, useEffect } from "react";
import { QuickLogEntry } from "@/types/types";
import { parseNum } from "@/lib/helpers/utils";

type QuickLogModalProps = {
  isOpen: boolean;
  onCloseClick: () => void;
  onSubmitClick: (entry: QuickLogEntry) => void;
  slotLabel: string;
};

export default function QuickLogEntryModal({
  isOpen,
  onCloseClick,
  onSubmitClick,
  slotLabel,
}: QuickLogModalProps) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [sugar, setSugar] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCloseClick]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const entry: QuickLogEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      calories: parseNum(calories),
      protein_g: parseNum(protein),
      fat_g: parseNum(fat),
      carbs_g: parseNum(carbs),
      sugar_g: parseNum(sugar),
    };
    onSubmitClick(entry);
    setName("");
    setCalories("");
    setProtein("");
    setFat("");
    setCarbs("");
    setSugar("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onCloseClick}
    >
      <div
        className="bg-surface border-2 border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top border */}
        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/50 border-dashed text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text">
            Quick Log
          </h2>
          {slotLabel && (
            <p className="text-sm text-text-secondary mt-1">{slotLabel}</p>
          )}
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Meal Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Protein shake"
              className="w-full px-3 py-2 bg-background border-2 border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          {/* Macro fields */}
          <div>
            <p className="text-xs text-text-secondary mb-2">
              Macros are optional — blank fields are ignored in totals.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Calories
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-10 bg-background border-2 border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    cal
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Protein
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-7 bg-background border-2 border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    g
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Fat
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-7 bg-background border-2 border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    g
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Carbs
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-7 bg-background border-2 border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    g
                  </span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Sugar
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-7 bg-background border-2 border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    g
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 px-5 pb-4 pt-2">
          <button
            onClick={onCloseClick}
            className="px-6 py-2 bg-surface hover:bg-muted border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-md"
          >
            Add
          </button>
        </div>

        {/* Decorative bottom border */}
        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />
      </div>
    </div>
  );
}
