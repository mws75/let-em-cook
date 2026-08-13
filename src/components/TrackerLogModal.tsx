"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DAILY_SLOTS,
  DailyLogEntry,
  DailySlot,
  Recipe,
} from "@/types/types";
import { parseNum } from "@/lib/helpers/utils";
import {
  FoodMacros,
  FoodSearchResult,
  FoodSource,
  ServingOption,
  scaleFrom100g,
  scaleMacros,
} from "@/lib/foods/provider";
import { ParsedFoodQuery, matchServing } from "@/lib/foods/parseQuery";

type Mode = "recents" | "foods" | "recipe" | "manual";

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
  const initialMode: Mode = recents.length > 0 ? "recents" : "foods";

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

  // Foods tab (USDA database search)
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState<FoodSearchResult[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError] = useState<string | null>(null);
  const [foodSource, setFoodSource] = useState<FoodSource | null>(null);
  const [parsedQuery, setParsedQuery] = useState<ParsedFoodQuery | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [foodServing, setFoodServing] = useState<ServingOption | null>(null);
  // external_id of the result whose real serving sizes are being fetched, so the
  // tapped row can show a loading hint. Null when idle.
  const [foodSelecting, setFoodSelecting] = useState<string | null>(null);

  // Reset whenever the modal opens with a fresh slot.
  useEffect(() => {
    if (!isOpen) return;
    setMode(recents.length > 0 ? "recents" : "foods");
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

  // Foods tab: debounced search-as-you-type (300ms, min 2 chars). Aborts the
  // in-flight request on each keystroke. Skipped once a food is selected (the
  // form is showing) and when not on the Foods tab.
  useEffect(() => {
    if (mode !== "foods" || selectedFood) return;
    const q = foodQuery.trim();
    if (q.length < 2) {
      setFoodResults([]);
      setFoodError(null);
      setFoodLoading(false);
      return;
    }

    setFoodLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const data = await res.json();
        const results: FoodSearchResult[] = data.results ?? [];
        setFoodResults(results);
        setParsedQuery(data.parsed ?? null);
        setFoodSource(data.source ?? null);
        // Distinguish "the database is unreachable" from "genuinely no matches"
        // so we don't tell the user to rename their food when USDA is down.
        if (data.status === "error") {
          setFoodError(
            "Couldn't reach the food database. Try again, or use Manual.",
          );
        } else if (results.length === 0) {
          setFoodError(
            "No matches. Try a different name, or use Manual to enter macros yourself.",
          );
        } else {
          setFoodError(null);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setFoodResults([]);
        setFoodError(
          "Couldn't reach the food database. Try again, or use Manual.",
        );
      } finally {
        setFoodLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [foodQuery, mode, selectedFood]);

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
    setFoodQuery("");
    setFoodResults([]);
    setFoodLoading(false);
    setFoodError(null);
    setFoodSource(null);
    setParsedQuery(null);
    setSelectedFood(null);
    setFoodServing(null);
    setFoodSelecting(null);
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
    else if (selectedFood) applyFood(selectedFood, foodServing, rounded);
  };

  // ----- Foods tab helpers (mirror the recipe flow) -----

  // The serving to use when the food provides a portions list. Prefer the one
  // matching the food's default label, else the first, else a synthetic serving
  // built from default_serving_grams.
  const defaultServingOf = (food: FoodSearchResult): ServingOption => {
    if (food.available_servings?.length) {
      return (
        food.available_servings.find(
          (s) => s.label === food.default_serving_label,
        ) ?? food.available_servings[0]
      );
    }
    return {
      label: food.default_serving_label,
      unit: "serving",
      qty: 1,
      grams: food.default_serving_grams,
    };
  };

  // Scale a food's macros for the chosen serving × servings multiplier. Uses the
  // per-100g truth when available (same math the server does), else falls back
  // to scaling the provided per-serving macros.
  const macrosForFood = (
    food: FoodSearchResult,
    serving: ServingOption | null,
    mult: number,
  ): FoodMacros => {
    if (food.per_100g && serving?.grams != null) {
      return scaleFrom100g(food.per_100g, serving.grams * mult);
    }
    return scaleMacros(food.per_serving, mult);
  };

  const applyFood = (
    food: FoodSearchResult,
    serving: ServingOption | null,
    servingsValue: number,
  ) => {
    setSelectedFood(food);
    setFoodServing(serving);
    setName(food.brand ? `${food.name} · ${food.brand}` : food.name);
    const m = macrosForFood(food, serving, servingsValue);
    setCalories(m.calories != null ? String(m.calories) : "");
    setProtein(m.protein_g != null ? String(m.protein_g) : "");
    setFat(m.fat_g != null ? String(m.fat_g) : "");
    setCarbs(m.carbs_g != null ? String(m.carbs_g) : "");
    setSugar(m.sugar_g != null ? String(m.sugar_g) : "");
  };

  // A food has usable portions when it carries at least one non-gram serving
  // ("1 medium", "1 cup"). USDA search results only ever carry the "100 g"
  // fallback, so this is false for them until enriched via /api/foods/servings.
  const hasRealServings = (food: FoodSearchResult): boolean =>
    (food.available_servings ?? []).some((s) => s.unit.toLowerCase() !== "g");

  // Fetch real serving sizes for a food from the detail endpoint. USDA's search
  // response omits them, so we pull them once on selection. Silently keeps the
  // search-time fallback if the lookup fails.
  const fetchFoodServings = async (
    food: FoodSearchResult,
  ): Promise<ServingOption[]> => {
    const res = await fetch(
      `/api/foods/servings?source=${encodeURIComponent(
        food.source,
      )}&id=${encodeURIComponent(food.external_id)}`,
    );
    if (!res.ok) throw new Error(`servings ${res.status}`);
    const data = await res.json();
    return (data.servings ?? []) as ServingOption[];
  };

  // Selecting a result: enrich it with real portions (one detail request) when
  // the search result only had the "100 g" fallback, then prefill the form.
  const handleSelectFood = async (food: FoodSearchResult) => {
    let enriched = food;
    if (!hasRealServings(food)) {
      setFoodSelecting(food.external_id);
      try {
        const servings = await fetchFoodServings(food);
        const primary = servings.find((s) => s.unit.toLowerCase() !== "g");
        if (primary) {
          // Point the default at a real portion so an un-parsed selection lands
          // on "1 cup, sliced" rather than the "100 g" fallback that search gave.
          enriched = {
            ...food,
            available_servings: servings,
            default_serving_label: primary.label,
            default_serving_grams: primary.grams ?? food.default_serving_grams,
          };
        }
      } catch {
        // Keep the search result's fallback serving; every field stays editable.
      } finally {
        setFoodSelecting(null);
      }
    }
    applySelectedFood(enriched);
  };

  const applySelectedFood = (food: FoodSearchResult) => {
    // Weight-quantity queries ("100g cheddar", "8 oz chicken") encode the amount
    // in grams. Log them against a gram serving with the multiplier carrying the
    // amount — never multiply a gram serving by the gram count (that double-counts).
    if (parsedQuery?.grams != null) {
      const gramServing: ServingOption =
        food.available_servings?.find((s) => s.unit.toLowerCase() === "g") ?? {
          label: "100 g",
          unit: "g",
          qty: 100,
          grams: 100,
        };
      const base = gramServing.grams ?? 100;
      const mult = parsedQuery.grams / base;
      setServings(mult);
      applyFood(food, gramServing, mult);
      return;
    }

    // Otherwise use the parsed quantity/unit ("2 large eggs") to pre-pick a
    // matching serving + multiplier so macros land without the user touching it.
    const matched = parsedQuery
      ? matchServing(parsedQuery, food.available_servings)
      : undefined;
    const serving = matched ?? defaultServingOf(food);
    const mult =
      parsedQuery && parsedQuery.qty > 0 ? parsedQuery.qty : servings;
    setServings(mult);
    applyFood(food, serving, mult);
  };

  const handleServingSelect = (label: string) => {
    if (!selectedFood) return;
    const serving =
      selectedFood.available_servings?.find((s) => s.label === label) ??
      foodServing;
    applyFood(selectedFood, serving ?? null, servings);
  };

  const clearSelectedFood = () => {
    setSelectedFood(null);
    setFoodServing(null);
    clearMacroFields();
  };

  const clearMacroFields = () => {
    setName("");
    setCalories("");
    setProtein("");
    setFat("");
    setCarbs("");
    setSugar("");
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
      kind: selectedRecipe ? "recipe" : selectedFood ? "food" : "manual",
      recipe_id: selectedRecipe?.recipe_id,
      food_source: selectedFood?.source,
      food_external_id: selectedFood?.external_id,
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
              active={mode === "foods"}
              onClick={() => {
                setMode("foods");
                clearForm();
              }}
              label="Foods"
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

          {mode === "foods" && !selectedFood && (
            <FoodSearchPanel
              query={foodQuery}
              onQueryChange={setFoodQuery}
              results={foodResults}
              loading={foodLoading}
              error={foodError}
              source={foodSource}
              onPick={handleSelectFood}
              selectingId={foodSelecting}
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

          {(mode === "manual" ||
            mode === "recipe" ||
            (mode === "foods" && selectedFood)) && (
            <>
              {mode === "foods" && selectedFood && (
                <button
                  onClick={clearSelectedFood}
                  className="text-xs text-text-secondary hover:text-text inline-flex items-center gap-1"
                >
                  ← Back to search
                </button>
              )}

              {mode === "foods" &&
                selectedFood &&
                (selectedFood.available_servings?.length ?? 0) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Serving
                    </label>
                    <select
                      value={foodServing?.label ?? ""}
                      onChange={(e) => handleServingSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                    >
                      {selectedFood.available_servings!.map((s) => (
                        <option key={s.label} value={s.label}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    if (selectedFood) setSelectedFood(null);
                  }}
                  placeholder="e.g. Protein shake"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              <div>
                <p className="text-xs text-text-secondary mb-2">
                  {selectedRecipe
                    ? "Macros auto-fill from recipe × servings. Edit to override."
                    : selectedFood
                      ? "Macros from the food database × serving. Edit to override."
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

        {/* Footer buttons (hidden in recents mode — that's one-tap — and while
            still searching foods, before a result is picked) */}
        {mode !== "recents" && !(mode === "foods" && !selectedFood) && (
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

function FoodSearchPanel({
  query,
  onQueryChange,
  results,
  loading,
  error,
  source,
  onPick,
  selectingId,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  results: FoodSearchResult[];
  loading: boolean;
  error: string | null;
  source: FoodSource | null;
  onPick: (food: FoodSearchResult) => void;
  selectingId: string | null;
}) {
  const macroLine = (food: FoodSearchResult): string => {
    const m = food.per_serving;
    const parts: string[] = [];
    if (m.calories != null) parts.push(`${Math.round(m.calories)} cal`);
    if (m.protein_g != null) parts.push(`${Math.round(m.protein_g)}P`);
    if (m.fat_g != null) parts.push(`${Math.round(m.fat_g)}F`);
    if (m.carbs_g != null) parts.push(`${Math.round(m.carbs_g)}C`);
    return parts.join(" · ");
  };

  return (
    <>
      <div className="relative">
        <input
          type="search"
          autoFocus
          inputMode="search"
          autoCapitalize="none"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search foods — e.g. 1 large apple, 100g cheddar"
          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary animate-pulse">
            …
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-text-secondary text-center py-4">{error}</p>
      )}

      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-background">
          {results.map((food) => {
            const isSelecting = selectingId === food.external_id;
            return (
              <button
                key={`${food.source}:${food.external_id}`}
                onClick={() => onPick(food)}
                disabled={selectingId != null}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-all disabled:opacity-60 disabled:cursor-default"
              >
                <span className="text-base">🍎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {food.name}
                    {food.brand && (
                      <span className="text-text-secondary font-normal">
                        {" "}
                        · {food.brand}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary tabular-nums">
                    {isSelecting ? (
                      <span className="animate-pulse">Loading serving sizes…</span>
                    ) : (
                      <>
                        {food.default_serving_label}
                        {macroLine(food) && ` · ${macroLine(food)}`}
                      </>
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {query.trim().length < 2 && !error && (
        <p className="text-xs text-text-secondary text-center py-4">
          Type a food to search the database. You can include an amount, like
          “2 eggs” or “1 cup rice”.
        </p>
      )}

      {source === "usda" && results.length > 0 && (
        <p className="text-[10px] text-text-secondary/70 text-center pt-1">
          Data: USDA FoodData Central
        </p>
      )}
    </>
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
