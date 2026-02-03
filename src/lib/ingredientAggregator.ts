import { Ingredients, GroceryItem, UnitType } from "@/types/types";
import {
  getUnitType,
  convertToBaseUnit,
  convertFromBaseUnit,
  chooseDisplayUnit,
} from "./unitConverter";

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function aggregateIngredients(ingredients: Ingredients[]): GroceryItem[] {
  // Step 1: Group by normalized name
  const groupedByName = new Map<string, Ingredients[]>();

  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    const existing = groupedByName.get(normalizedName) || [];
    existing.push(ingredient);
    groupedByName.set(normalizedName, existing);
  }

  const results: GroceryItem[] = [];

  // Step 2: For each name group, sub-group by unit type and aggregate
  for (const [normalizedName, items] of groupedByName) {
    // Find the best display name (prefer capitalized original)
    const displayName =
      items.find((i) => i.name[0] === i.name[0].toUpperCase())?.name ||
      capitalizeFirst(normalizedName);

    // Sub-group by unit type
    const byUnitType = new Map<UnitType, Ingredients[]>();
    for (const item of items) {
      const unitType = getUnitType(item.unit);
      const existing = byUnitType.get(unitType) || [];
      existing.push(item);
      byUnitType.set(unitType, existing);
    }

    // Aggregate each unit type subgroup
    for (const [unitType, subItems] of byUnitType) {
      if (unitType === "other") {
        // "Other" units can't be aggregated - keep each as separate item
        for (const item of subItems) {
          results.push({
            name: normalizedName,
            displayName,
            quantity: item.quantity || 0,
            unit: item.unit,
            unitType,
          });
        }
        continue;
      }

      if (unitType === "count") {
        // Count units: just sum the quantities, use most common unit
        const totalQty = subItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const displayUnit = chooseDisplayUnit(subItems.map((i) => i.unit));

        results.push({
          name: normalizedName,
          displayName,
          quantity: totalQty,
          unit: displayUnit,
          unitType,
        });
        continue;
      }

      // Volume or Weight: convert to base unit, sum, convert back
      let totalBase = 0;
      const units: string[] = [];

      for (const item of subItems) {
        const converted = convertToBaseUnit(item.quantity || 0, item.unit);
        if (converted) {
          totalBase += converted.value;
          units.push(item.unit);
        }
      }

      // Choose display unit and convert back
      const displayUnit = chooseDisplayUnit(units);
      const finalQty = convertFromBaseUnit(totalBase, displayUnit);

      if (finalQty !== null) {
        results.push({
          name: normalizedName,
          displayName,
          quantity: finalQty,
          unit: displayUnit,
          unitType,
        });
      }
    }
  }

  return results;
}
