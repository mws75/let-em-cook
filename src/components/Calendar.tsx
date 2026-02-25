"use client";
import { useState } from "react";
import { Recipe } from "@/types/types";
import { getCategoryColor } from "@/lib/categoryColors";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const MEALS = ["breakfast", "lunch", "dinner"] as const;

type DayKey = (typeof DAYS)[number];
type MealKey = (typeof MEALS)[number];
type DayPlan = Record<MealKey, Recipe[]>;
type WeekPlan = Record<DayKey, DayPlan>;

const emptyDay = (): DayPlan => ({ breakfast: [], lunch: [], dinner: [] });
const emptyWeek = (): WeekPlan =>
  Object.fromEntries(DAYS.map((d) => [d, emptyDay()])) as WeekPlan;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type CalendarProps = {
  selectedRecipes: Recipe[];
  onClose: () => void;
};

export default function Calendar({ selectedRecipes, onClose }: CalendarProps) {
  const [snacks, setSnacks] = useState<Recipe[]>([]);
  const [week, setWeek] = useState<WeekPlan>(emptyWeek());
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

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

  const handleClearAll = () => {
    setSnacks([]);
    setWeek(emptyWeek());
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
            {renderDropZone("snacks", snacks, handleDropSnacks, removeSnack)}
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
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="px-2 py-3 text-text font-bold text-sm border-2 border-border bg-muted/30 text-center align-middle">
                      {capitalize(day)}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
