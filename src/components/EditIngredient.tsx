"use client";
import { useState } from "react";
import { Ingredients } from "@/types/types";

type Props = {
  ingredients: Ingredients[];
  onChange?: (next: Ingredients[]) => void;
};

export const RECIPE_QUANTITY_UNITS: string[] = [
  // Volume (US)
  "tsp",
  "teaspoon",
  "tbsp",
  "tablespoon",
  "cup",
  "pt",
  "pint",
  "qt",
  "quart",
  "gal",
  "gallon",

  // Volume (Metric)
  "ml",
  "milliliter",
  "l",
  "liter",

  // Weight (US)
  "oz",
  "ounce",
  "lb",
  "pound",

  // Weight (Metric)
  "g",
  "gram",
  "kg",
  "kilogram",

  // Count / Misc
  "piece",
  "pieces",
  "clove",
  "cloves",
  "slice",
  "slices",
  "can",
  "cans",
  "package",
  "packages",
  "stick",
  "sticks",

  // Common informal units
  "dash",
  "pinch",
  "handful",
];

export default function EditIngredient({ ingredients, onChange }: Props) {
  const [rows, setRows] = useState<Ingredients[]>(ingredients);

  const updateCell = (
    id: string,
    field: keyof Ingredients,
    value: string | number,
  ) => {
    const updatedRows = rows.map((r) =>
      r.name === id ? { ...r, [field]: value } : r,
    );
    setRows(updatedRows);
    onChange?.(updatedRows);
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl border-2 border-border bg-muted/30">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-primary/20">
            <tr className="border-b-2 border-border">
              <th className="px-3 py-2 sm:px-6 sm:py-4 text-left font-bold text-text">
                🥬 Ingredient
              </th>
              <th className="px-3 py-2 sm:px-6 sm:py-4 text-left font-bold text-text">
                📊 Quantity
              </th>
              <th className="px-3 py-2 sm:px-6 sm:py-4 text-left font-bold text-text">
                📏 Unit
              </th>
              <th className="px-3 py-2 sm:px-6 sm:py-4 text-left font-bold text-text">
                ✂️ Prep
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.name}
                className={`border-b border-border hover:bg-surface transition-colors ${
                  index % 2 === 0 ? "bg-surface/50" : "bg-surface"
                }`}
              >
                {/* Column 1: Read Only - Name */}
                <td className="px-3 py-2 sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌿</span>
                    <span className="text-text font-semibold">{row.name}</span>
                  </div>
                </td>

                {/* Column 2: Editable - Quantity */}
                <td className="px-3 py-2 sm:px-6 sm:py-4">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) =>
                      updateCell(row.name, "quantity", Number(e.target.value))
                    }
                    className="w-16 sm:w-24 rounded-lg border-2 border-border px-3 py-2 bg-surface text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="0"
                  />
                </td>

                {/* Column 3: Editable - Unit */}
                <td className="px-3 py-2 sm:px-6 sm:py-4">
                  <input
                    type="text"
                    value={row.unit}
                    onChange={(e) =>
                      updateCell(row.name, "unit", e.target.value)
                    }
                    list="units-list"
                    className="w-20 sm:w-32 rounded-lg border-2 border-border px-3 py-2 bg-surface text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="cup"
                  />
                </td>

                {/* Column 4: Editable - Prep */}
                <td className="px-3 py-2 sm:px-6 sm:py-4">
                  <input
                    type="text"
                    value={row.prep || ""}
                    onChange={(e) =>
                      updateCell(row.name, "prep", e.target.value)
                    }
                    className="w-24 sm:w-40 rounded-lg border-2 border-border px-3 py-2 bg-surface text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="diced, chopped..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Datalist for unit suggestions */}
        <datalist id="units-list">
          {RECIPE_QUANTITY_UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </div>

      {/* Helpful tip */}
      <div className="mt-4 p-4 bg-secondary/10 border-2 border-border rounded-xl">
        <p className="text-sm text-text-secondary">
          💡 <strong>Tip:</strong> Update quantities and units to match your
          preferences. The prep field is for instructions like "diced",
          "chopped", or "minced".
        </p>
      </div>
    </div>
  );
}
