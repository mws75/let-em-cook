"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DAILY_SLOTS,
  DailyLogEntry,
  DailySlot,
  Recipe,
} from "@/types/types";
import { parseNum } from "@/lib/helpers/utils";

type Mode = "recents" | "recipe" | "manual";

type TrackerLogModalProps = {
  isOpen: boolean;
  defaultSlot: DailySlot;
  recipes: Recipe[];
  recents: DailyLogEntry[];
  onClose: () => void;
  onSubmit: (entry: DailyLogEntry) => void;
};

const SLOT_LABEL: Record<DailySlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const SERVINGS_STEP = 0.25;
const SERVINGS_MIN = 0.25;
const SERVINGS_MAX = 10;

const formatServings = (n: number): string =>
  n
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");

const round1 = (n: number): number => Math.round(n * 10) / 10;

export default function TrackerLogModal({
  isOpen,
  defaultSlot,
  recipes,
  recents,
  onClose,
  onSubmit,
}: TrackerLogModalProps) {
  const initialMode: Mode = recents.length > 0 ? "recents" : "manual";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [slot, setSlot] = useState<DailySlot>(defaultSlot);
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [sugar, setSugar] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Reset whenever the modal opens with a fresh slot.
  useEffect(() => {
    if (!isOpen) return;
    setMode(recents.length > 0 ? "recents" : "manual");
    setSlot(defaultSlot);
    clearForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultSlot]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const clearForm = () => {
    setName("");
    setServings(1);
    setCalories("");
    setProtein("");
    setFat("");
    setCarbs("");
    setSugar("");
    setRecipeSearch("");
    setSelectedRecipe(null);
  };

  // When a recipe is selected (or servings change while linked), recompute
  // macros as per-serving × servings. Editing a macro field afterward sticks
  // — until the user picks a new recipe or changes servings again.
  const applyRecipe = (recipe: Recipe, servingsValue: number) => {
    setSelectedRecipe(recipe);
    setName(`${recipe.emoji} ${recipe.name}`.trim());
    const mul = servingsValue;
    setCalories(
      recipe.per_serving_calories
        ? String(round1(recipe.per_serving_calories * mul))
        : "",
    );
    setProtein(
      recipe.per_serving_protein_g
        ? String(round1(recipe.per_serving_protein_g * mul))
        : "",
    );
    setFat(
      recipe.per_serving_fat_g
        ? String(round1(recipe.per_serving_fat_g * mul))
        : "",
    );
    setCarbs(
      recipe.per_serving_carbs_g
        ? String(round1(recipe.per_serving_carbs_g * mul))
        : "",
    );
    setSugar(
      recipe.per_serving_sugar_g
        ? String(round1(recipe.per_serving_sugar_g * mul))
        : "",
    );
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    applyRecipe(recipe, servings);
  };

  const handleServingsChange = (next: number) => {
    const clamped = Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, next));
    const rounded = Math.round(clamped / SERVINGS_STEP) * SERVINGS_STEP;
    setServings(rounded);
    if (selectedRecipe) applyRecipe(selectedRecipe, rounded);
  };

  // Manual edits drop the recipe link silently — but we still keep
  // selectedRecipe.recipe_id in the entry on submit (analytics/back-link).
  const handleManualEdit =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((r) =>
        r.name.toLowerCase().includes(recipeSearch.toLowerCase()),
      ),
    [recipes, recipeSearch],
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    const entry: DailyLogEntry = {
      id: crypto.randomUUID(),
      slot,
      kind: selectedRecipe ? "recipe" : "manual",
      recipe_id: selectedRecipe?.recipe_id,
      name: name.trim(),
      servings,
      calories: parseNum(calories),
      protein_g: parseNum(protein),
      fat_g: parseNum(fat),
      carbs_g: parseNum(carbs),
      sugar_g: parseNum(sugar),
      logged_at: new Date().toISOString(),
    };
    onSubmit(entry);
    clearForm();
    onClose();
  };

  // Recents one-tap log — clones the past entry into the current slot.
  const handleSubmitRecent = (recent: DailyLogEntry) => {
    const entry: DailyLogEntry = {
      ...recent,
      id: crypto.randomUUID(),
      slot,
      logged_at: new Date().toISOString(),
    };
    onSubmit(entry);
    onClose();
  };

  if (!isOpen) return null;

  const fieldClass =
    "w-full px-3 py-2 pr-7 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors tabular-nums";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracker-log-title"
      >
        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2 shrink-0" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/50 border-dashed text-center shrink-0">
          <h2
            id="tracker-log-title"
            className="text-2xl sm:text-3xl font-bold text-text"
          >
            Log Food
          </h2>
        </div>

        {/* Slot picker */}
        <div className="px-5 pt-3 shrink-0">
          <div
            role="radiogroup"
            aria-label="Meal slot"
            className="flex gap-1 p-1 bg-muted border border-border rounded-2xl"
          >
            {DAILY_SLOTS.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={slot === s}
                onClick={() => setSlot(s)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                  slot === s
                    ? "bg-surface text-text border border-border"
                    : "text-text-secondary hover:text-text"
                }`}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Mode tabs */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex gap-1 p-1 bg-muted border border-border rounded-2xl">
            <ModeTab
              active={mode === "recents"}
              onClick={() => {
                setMode("recents");
              }}
              label={`Recents${recents.length ? ` (${recents.length})` : ""}`}
            />
            <ModeTab
              active={mode === "recipe"}
              onClick={() => {
                setMode("recipe");
                clearForm();
              }}
              label="Recipe"
              disabled={recipes.length === 0}
            />
            <ModeTab
              active={mode === "manual"}
              onClick={() => {
                setMode("manual");
                clearForm();
              }}
              label="Manual"
            />
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="px-5 pt-3 pb-3 space-y-3 overflow-y-auto flex-1">
          {mode === "recents" && (
            <RecentsList
              recents={recents}
              onPick={handleSubmitRecent}
            />
          )}

          {mode === "recipe" && (
            <>
              <input
                type="text"
                autoFocus
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Search your recipes..."
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-background">
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.recipe_id}
                      onClick={() => handleSelectRecipe(recipe)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                        selectedRecipe?.recipe_id === recipe.recipe_id
                          ? "bg-primary/20 border border-primary/40"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <span className="text-base">{recipe.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {recipe.name}
                        </p>
                        <p className="text-xs text-text-secondary tabular-nums">
                          {Math.round(recipe.per_serving_calories)} cal ·{" "}
                          {Math.round(recipe.per_serving_protein_g)}P ·{" "}
                          {Math.round(recipe.per_serving_fat_g)}F ·{" "}
                          {Math.round(recipe.per_serving_carbs_g)}C
                        </p>
                      </div>
                      {selectedRecipe?.recipe_id === recipe.recipe_id && (
                        <span className="text-primary text-sm">✓</span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-text-secondary text-center py-3">
                    No recipes found
                  </p>
                )}
              </div>
            </>
          )}

          {mode !== "recents" && (
            <>
              <ServingsStepper
                value={servings}
                onChange={handleServingsChange}
              />

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  autoFocus={mode === "manual"}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (selectedRecipe) setSelectedRecipe(null);
                  }}
                  placeholder="e.g. Protein shake"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              <div>
                <p className="text-xs text-text-secondary mb-2">
                  {selectedRecipe
                    ? "Macros auto-fill from recipe × servings. Edit to override."
                    : "Macros are optional — blank fields are ignored in totals."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <MacroField
                    label="Calories"
                    unit="cal"
                    value={calories}
                    onChange={handleManualEdit(setCalories)}
                  />
                  <MacroField
                    label="Protein"
                    unit="g"
                    value={protein}
                    onChange={handleManualEdit(setProtein)}
                  />
                  <MacroField
                    label="Fat"
                    unit="g"
                    value={fat}
                    onChange={handleManualEdit(setFat)}
                  />
                  <MacroField
                    label="Carbs"
                    unit="g"
                    value={carbs}
                    onChange={handleManualEdit(setCarbs)}
                  />
                  <div className="col-span-2 sm:col-span-1">
                    <MacroField
                      label="Sugar"
                      unit="g"
                      value={sugar}
                      onChange={handleManualEdit(setSugar)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons (hidden in recents mode — that's one-tap) */}
        {mode !== "recents" && (
          <div className="flex justify-center gap-4 px-5 pb-4 pt-2 border-t border-border/50 shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-surface hover:bg-muted border border-border rounded-xl font-bold text-text transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-6 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-all disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}

        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2 shrink-0" />
      </div>
    </div>
  );
}

// ---------- Subcomponents ----------

function ModeTab({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-surface text-text border border-border"
          : "text-text-secondary hover:text-text"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}

function ServingsStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-text-secondary">Servings</span>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => onChange(value - SERVINGS_STEP)}
          className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 border border-border font-bold text-text disabled:opacity-40"
          disabled={value <= SERVINGS_MIN}
          aria-label="Decrease servings"
        >
          –
        </button>
        <span className="min-w-[3.5rem] text-center font-bold text-text tabular-nums">
          ×{formatServings(value)}
        </span>
        <button
          onClick={() => onChange(value + SERVINGS_STEP)}
          className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 border border-border font-bold text-text disabled:opacity-40"
          disabled={value >= SERVINGS_MAX}
          aria-label="Increase servings"
        >
          +
        </button>
      </div>
    </div>
  );
}

function MacroField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={onChange}
          placeholder="0"
          className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
          {unit}
        </span>
      </div>
    </div>
  );
}

function RecentsList({
  recents,
  onPick,
}: {
  recents: DailyLogEntry[];
  onPick: (entry: DailyLogEntry) => void;
}) {
  if (recents.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-6">
        Nothing logged yet — add a few meals and they&apos;ll show up here for
        one-tap re-logging.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5">
      {recents.map((e) => (
        <li key={`${e.id}-${e.logged_at}`}>
          <button
            onClick={() => onPick(e)}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 border border-transparent hover:border-border transition-all"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">
                {e.name}
              </p>
              <p className="text-xs text-text-secondary tabular-nums">
                ×{formatServings(e.servings)}
                {e.calories != null && ` · ${Math.round(e.calories)} cal`}
                {e.protein_g != null && ` · ${Math.round(e.protein_g)}P`}
                {e.fat_g != null && ` · ${Math.round(e.fat_g)}F`}
                {e.carbs_g != null && ` · ${Math.round(e.carbs_g)}C`}
              </p>
            </div>
            <span className="text-text-secondary text-sm">＋</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
