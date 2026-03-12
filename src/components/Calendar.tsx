"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Recipe,
  DAYS,
  MEALS,
  MealKey,
  DayKey,
  QuickLogEntry,
  MealSlotData,
  MealPlanData,
} from "@/types/types";
import { getCategoryColor } from "@/lib/categoryColors";

type DayPlan = Record<MealKey, Recipe[]>;
type WeekPlan = Record<DayKey, DayPlan>;

const emptyDay = (): DayPlan => ({ breakfast: [], lunch: [], dinner: [] });
const emptyWeek = (): WeekPlan =>
  Object.fromEntries(DAYS.map((d) => [d, emptyDay()])) as WeekPlan;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Macros = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const ZERO_MACROS: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

const sumMacros = (recipes: Recipe[]): Macros =>
  recipes.reduce(
    (acc, r) => ({
      calories: acc.calories + Math.round(r.per_serving_calories),
      protein: acc.protein + Math.round(r.per_serving_protein_g),
      fat: acc.fat + Math.round(r.per_serving_fat_g),
      carbs: acc.carbs + Math.round(r.per_serving_carbs_g),
    }),
    { ...ZERO_MACROS },
  );

const addMacros = (a: Macros, b: Macros): Macros => ({
  calories: a.calories + b.calories,
  protein: a.protein + b.protein,
  fat: a.fat + b.fat,
  carbs: a.carbs + b.carbs,
});

type CalendarProps = {
  selectedRecipes: Recipe[];
  allRecipes: Recipe[];
  initialPlan: MealPlanData | null;
  onPlanCleared: () => void;
  onClose: () => void;
};

export default function Calendar({
  selectedRecipes,
  allRecipes,
  initialPlan,
  onPlanCleared,
  onClose,
}: CalendarProps) {
  const [snacks, setSnacks] = useState<Recipe[]>([]);
  const [week, setWeek] = useState<WeekPlan>(emptyWeek());
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const hasInitialized = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------- UseEffect ----------------------
  useEffect(() => {
    // prevents rehydration multiple times
    if (!initialPlan || hasInitialized.current) return;

    hasInitialized.current = true;
    // Look up map
    const recipeMap = new Map(allRecipes.map((r) => [r.recipe_id, r]));

    const resolvedIds = (ids: number[]): Recipe[] => {
      return ids.map((id) => recipeMap.get(id)).filter(Boolean) as Recipe[];
    };

    //Hydrate Week
    const newWeek = emptyWeek();
    for (const day of DAYS) {
      for (const meal of MEALS) {
        const slot = initialPlan.week?.[day]?.[meal];
        if (slot) {
          newWeek[day][meal] = resolvedIds(slot.recipeIds || []);
        }
      }
    }
    setWeek(newWeek);

    // Hydrate Snacks
    if (initialPlan.snacks) {
      setSnacks(resolvedIds(initialPlan.snacks.recipeIds || []));
    }
  }, [initialPlan, allRecipes]);

  // Serialization Helper
  const serializePlan = useCallback((): MealPlanData => {
    const weekData = {} as Record<DayKey, Record<MealKey, MealSlotData>>;
    for (const day of DAYS) {
      weekData[day] = {} as Record<MealKey, MealSlotData>;
      for (const meal of MEALS) {
        weekData[day][meal] = {
          recipeIds: week[day][meal].map((r) => r.recipe_id),
          quickLogs: [], // Will be populated later
        };
      }
    }
    return {
      week: weekData,
      snacks: {
        recipeIds: snacks.map((r) => r.recipe_id),
        quickLogs: [],
      },
    };
  }, [week, snacks]);

  const isPlanEmpty = useCallback((): boolean => {
    const hasWeekContent = DAYS.some((day) =>
      MEALS.some((meal) => week[day][meal].length > 0),
    );
    return !hasWeekContent && snacks.length === 0;
  }, [week, snacks]);

  // Debounce Method for AutoSave
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (isPlanEmpty()) return;
      setSaveStatus("saving");
      try {
        // response
        const res = await fetch("/api/meal-plan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: serializePlan() }),
        });
        // check response
        setSaveStatus(res.ok ? "saved" : "error");
      } catch (err) {
        setSaveStatus("error");
      }
    }, 1000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [week, snacks, serializePlan, isPlanEmpty]);

  // Mark as initialized if there is no plan to hydrate
  useEffect(() => {
    if (!initialPlan && !hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [initialPlan]);

  // -------------------- Drag & Drop --------------------

  const handleDragStart = (e: React.DragEvent, recipe: Recipe) => {
    e.dataTransfer.setData("text/plain", String(recipe.recipe_id));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setDragOverTarget(null);
  };

  const getRecipeFromDrop = (e: React.DragEvent): Recipe | null => {
    const id = Number(e.dataTransfer.getData("text/plain"));
    return selectedRecipes.find((r) => r.recipe_id === id) || null;
  };

  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dragOverTarget !== target) setDragOverTarget(target);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handleDropSnacks = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    const recipe = getRecipeFromDrop(e);
    if (recipe) setSnacks((prev) => [...prev, recipe]);
  };

  const handleDropMeal = (e: React.DragEvent, day: DayKey, meal: MealKey) => {
    e.preventDefault();
    setDragOverTarget(null);
    const recipe = getRecipeFromDrop(e);
    if (recipe) {
      setWeek((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: [...prev[day][meal], recipe],
        },
      }));
    }
  };

  // -------------------- Remove --------------------

  const removeSnack = (index: number) => {
    setSnacks((prev) => prev.filter((_, i) => i !== index));
  };

  const removeMealItem = (day: DayKey, meal: MealKey, index: number) => {
    setWeek((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: prev[day][meal].filter((_, i) => i !== index),
      },
    }));
  };

  const handleClearAll = async () => {
    setSnacks([]);
    setWeek(emptyWeek());
    try {
      await fetch("/api/meal-plan", { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
    onPlanCleared();
  };
  // -------------------- Print --------------------

  const handlePrint = () => {
    window.print();
  };

  // -------------------- Render Helpers --------------------

  const renderChip = (
    recipe: Recipe,
    key: string,
    options?: { onRemove?: () => void; draggable?: boolean },
  ) => {
    const categoryColor = getCategoryColor(recipe.category || "");
    return (
      <div
        key={key}
        className={`inline-flex items-center gap-1 border-2 border-border rounded-xl px-3 py-1 text-sm font-bold text-text ${
          options?.draggable
            ? "cursor-grab active:cursor-grabbing hover:shadow-md"
            : ""
        }`}
        draggable={options?.draggable}
        onDragStart={
          options?.draggable ? (e) => handleDragStart(e, recipe) : undefined
        }
        onDragEnd={options?.draggable ? handleDragEnd : undefined}
        style={{
          background: "#ffffff",
          boxShadow: `inset 0 0 12px 4px ${categoryColor}`,
        }}
      >
        <span>
          {recipe.emoji} {recipe.name}
        </span>
        {options?.onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              options.onRemove!();
            }}
            className="ml-1 text-text-secondary hover:text-red-500 text-xs font-bold no-print"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  const renderDropZone = (
    targetId: string,
    items: Recipe[],
    onDrop: (e: React.DragEvent) => void,
    onRemoveItem: (index: number) => void,
    extraClass: string = "",
  ) => (
    <div
      className={`meal-plan-cell min-h-[4rem] border-2 rounded-xl p-2 transition-colors ${
        dragOverTarget === targetId
          ? "bg-primary/20 border-primary"
          : "border-border bg-surface"
      } ${extraClass}`}
      onDragOver={(e) => handleDragOver(e, targetId)}
      onDragLeave={handleDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap gap-1.5">
        {items.map((recipe, idx) =>
          renderChip(recipe, `${targetId}-${recipe.recipe_id}-${idx}`, {
            onRemove: () => onRemoveItem(idx),
          }),
        )}
      </div>
      {items.length === 0 && (
        <p className="text-text-secondary text-xs text-center py-2 no-print">
          Drop recipes here
        </p>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #meal-plan-print, #meal-plan-print * { visibility: visible; }
          #meal-plan-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.3in 0.4in;
          }
          #meal-plan-print .no-print { display: none !important; }
          #meal-plan-print .print-title { display: block !important; }
          #meal-plan-print .meal-plan-cell { min-height: auto !important; }
          #meal-plan-print {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #meal-plan-print table { page-break-inside: avoid; }
        }
      `}</style>

      <section className="border-2 border-border rounded-3xl p-6 bg-surface shadow-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-3xl text-text font-bold">📅 Meal Plan</h2>
          {saveStatus !== "idle" && (
            <span
              className={`text-xs font-medium no-print ${
                saveStatus === "saving"
                  ? "text-text-secondary"
                  : saveStatus === "saved"
                    ? "text-green-600"
                    : "text-red-500"
              }`}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved"
                  : "Save Failed"}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-muted hover:bg-muted/80 border-2 border-border rounded-xl font-semibold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Clear All
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Print Meal Plan
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Close
            </button>
          </div>
        </div>

        <div id="meal-plan-print">
          {/* Print-only title */}
          <h1 className="hidden print-title text-3xl font-bold text-center mb-4 text-text">
            Weekly Meal Plan
          </h1>

          {/* Recipe Palette - drag from here */}
          <div className="mb-6 no-print">
            <h3 className="text-lg text-text font-bold mb-2">Recipes</h3>
            <div className="border-2 border-border rounded-xl p-3 bg-muted/20">
              <div className="flex flex-wrap gap-2">
                {selectedRecipes.length > 0 ? (
                  selectedRecipes.map((recipe) =>
                    renderChip(recipe, `palette-${recipe.recipe_id}`, {
                      draggable: true,
                    }),
                  )
                ) : (
                  <p className="text-text-secondary text-sm">
                    Select recipes from your collection below to get started
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Snacks */}
          <div className="mb-6">
            <h3 className="text-lg text-text font-bold mb-2">Snacks</h3>
            <div className="flex gap-3">
              <div className="w-20 sm:w-24 shrink-0 border-2 border-border rounded-xl bg-muted/30 p-2 flex flex-col items-center justify-center text-center">
                {(() => {
                  const m = sumMacros(snacks);
                  if (m.calories === 0)
                    return (
                      <span className="text-text-secondary text-xs">—</span>
                    );
                  return (
                    <div className="text-xs leading-relaxed">
                      <p className="font-bold text-text">{m.calories}</p>
                      <p className="text-text-secondary">cal</p>
                      <p className="text-text-secondary mt-0.5">
                        {m.protein}P · {m.fat}F · {m.carbs}C
                      </p>
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1">
                {renderDropZone(
                  "snacks",
                  snacks,
                  handleDropSnacks,
                  removeSnack,
                )}
              </div>
            </div>
          </div>

          {/* Weekly Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-20 sm:w-24 px-2 py-3 text-text font-bold text-sm border-2 border-border bg-muted/30" />
                  {MEALS.map((meal) => (
                    <th
                      key={meal}
                      className="px-2 py-3 text-text font-bold text-sm sm:text-base border-2 border-border bg-muted/30"
                    >
                      {capitalize(meal)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const dayMacros = MEALS.reduce(
                    (acc, meal) => addMacros(acc, sumMacros(week[day][meal])),
                    { ...ZERO_MACROS },
                  );
                  return (
                    <tr key={day}>
                      <td className="px-2 py-2 text-text font-bold text-sm border-2 border-border bg-muted/30 text-center align-top">
                        <span>{capitalize(day)}</span>
                        {dayMacros.calories > 0 && (
                          <div className="mt-1 font-normal text-xs leading-relaxed text-text-secondary">
                            <p className="font-semibold text-text">
                              {dayMacros.calories} cal
                            </p>
                            <p>
                              {dayMacros.protein}P · {dayMacros.fat}F ·{" "}
                              {dayMacros.carbs}C
                            </p>
                          </div>
                        )}
                      </td>
                      {MEALS.map((meal) => (
                        <td
                          key={`${day}-${meal}`}
                          className="border-2 border-border p-1 align-top"
                        >
                          {renderDropZone(
                            `${day}-${meal}`,
                            week[day][meal],
                            (e) => handleDropMeal(e, day, meal),
                            (idx) => removeMealItem(day, meal, idx),
                            "min-h-[5rem]",
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Average Per Day */}
          {(() => {
            const daysWithFood = DAYS.filter((day) =>
              MEALS.some((meal) => week[day][meal].length > 0),
            );
            const totalMacros = DAYS.reduce(
              (acc, day) =>
                MEALS.reduce(
                  (inner, meal) => addMacros(inner, sumMacros(week[day][meal])),
                  acc,
                ),
              { ...ZERO_MACROS },
            );
            if (totalMacros.calories === 0) return null;
            const count = daysWithFood.length || 1;
            return (
              <div className="mt-4 border-2 border-border rounded-xl bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-text">
                  Avg / Day ({count} {count === 1 ? "day" : "days"})
                </span>
                <span className="text-sm text-text-secondary">
                  <span className="font-semibold text-text">
                    {Math.round(totalMacros.calories / count)} cal
                  </span>
                  {" · "}
                  {Math.round(totalMacros.protein / count)}g P{" · "}
                  {Math.round(totalMacros.fat / count)}g F{" · "}
                  {Math.round(totalMacros.carbs / count)}g C
                </span>
              </div>
            );
          })()}
        </div>
      </section>
    </>
  );
}
