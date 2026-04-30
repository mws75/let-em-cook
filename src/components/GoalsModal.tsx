"use client";
import { useEffect, useState } from "react";
import { MacroGoals } from "@/types/types";

type GoalsModalProps = {
  isOpen: boolean;
  initialGoals?: MacroGoals | null;
  onClose: () => void;
  onSaved: (goals: MacroGoals) => void;
};

const DEFAULTS = {
  calories: 2000,
  protein_g: 150,
  fat_g: 65,
  carbs_g: 220,
} as const;

const toField = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(n);

const parseField = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
};

export default function GoalsModal({
  isOpen,
  initialGoals,
  onClose,
  onSaved,
}: GoalsModalProps) {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields whenever the modal opens with (potentially) new initialGoals.
  useEffect(() => {
    if (!isOpen) return;
    setCalories(toField(initialGoals?.calories));
    setProtein(toField(initialGoals?.protein_g));
    setFat(toField(initialGoals?.fat_g));
    setCarbs(toField(initialGoals?.carbs_g));
    setError(null);
  }, [isOpen, initialGoals]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const goals: MacroGoals = {
      calories: parseField(calories),
      protein_g: parseField(protein),
      fat_g: parseField(fat),
      carbs_g: parseField(carbs),
    };

    try {
      const res = await fetch("/api/user/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save goals");
      }
      const data = (await res.json()) as { goals: MacroGoals };
      onSaved(data.goals);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goals");
    } finally {
      setSaving(false);
    }
  };

  const useSuggested = () => {
    setCalories(String(DEFAULTS.calories));
    setProtein(String(DEFAULTS.protein_g));
    setFat(String(DEFAULTS.fat_g));
    setCarbs(String(DEFAULTS.carbs_g));
  };

  const fieldClass =
    "w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors tabular-nums";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goals-modal-title"
      >
        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />

        <div className="px-5 pt-4 pb-3 border-b border-border/50 border-dashed text-center">
          <h2
            id="goals-modal-title"
            className="text-2xl sm:text-3xl font-bold text-text"
          >
            Daily Macro Goals
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Set your targets — leave any field blank to skip.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Calculator nudge */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <p className="text-text-secondary leading-relaxed">
              Not sure where to start? We recommend a trusted calculator —
              plug your numbers back in here.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href="https://www.mayoclinic.org/healthy-lifestyle/weight-loss/in-depth/calorie-calculator/itt-20402304"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-surface border border-border font-semibold text-text hover:bg-muted transition-colors"
              >
                Mayo Clinic ↗
              </a>
              <a
                href="https://www.precisionnutrition.com/nutrition-calculator"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-surface border border-border font-semibold text-text hover:bg-muted transition-colors"
              >
                Precision Nutrition ↗
              </a>
              <button
                onClick={useSuggested}
                type="button"
                className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 font-semibold text-text transition-colors"
              >
                Use suggested
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Calories
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder={String(DEFAULTS.calories)}
                  className={fieldClass}
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
                  inputMode="numeric"
                  min={0}
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder={String(DEFAULTS.protein_g)}
                  className={fieldClass}
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
                  inputMode="numeric"
                  min={0}
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder={String(DEFAULTS.fat_g)}
                  className={fieldClass}
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
                  inputMode="numeric"
                  min={0}
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder={String(DEFAULTS.carbs_g)}
                  className={fieldClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                  g
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-center gap-4 px-5 pb-4 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 bg-surface hover:bg-muted border border-border rounded-xl font-bold text-text transition-all disabled:opacity-40"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-all disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />
      </div>
    </div>
  );
}
