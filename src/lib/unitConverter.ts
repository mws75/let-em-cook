import { UnitType } from "@/types/types";

// Conversion ratios to base units (ml for volume, g for weight)
const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.929,
  tbsp: 14.787,
  cup: 236.588,
  "fl oz": 29.574,
  pt: 473.176,
  qt: 946.353,
  gal: 3785.41,
  ml: 1,
  l: 1000,
};

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
  kg: 1000,
};

const COUNT_UNITS = new Set([
  "each",
  "pc",
  "piece",
  "clove",
  "slice",
  "slices",
  "can",
  "cans",
  "pkg",
  "stick",
  "bunch",
  "sprig",
  "leaf",
  "leaves",
  "head",
  "medium",
  "large",
  "small",
]);

const OTHER_UNITS = new Set(["pinch", "dash", "to taste", "handful", ""]);

export function getUnitType(unit: string): UnitType {
  const normalized = unit.toLowerCase().trim();

  if (VOLUME_TO_ML[normalized]) return "volume";
  if (WEIGHT_TO_G[normalized]) return "weight";
  if (COUNT_UNITS.has(normalized)) return "count";
  return "other";
}

export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const type1 = getUnitType(unit1);
  const type2 = getUnitType(unit2);

  // Only same unit types can be aggregated
  if (type1 !== type2) return false;

  // "other" units are never compatible (can't add "pinch" + "dash")
  if (type1 === "other") return false;

  return true;
}

export function convertToBaseUnit(
  quantity: number,
  unit: string
): { value: number; baseUnit: string } | null {
  const normalized = unit.toLowerCase().trim();
  const unitType = getUnitType(normalized);

  if (unitType === "volume" && VOLUME_TO_ML[normalized]) {
    return { value: quantity * VOLUME_TO_ML[normalized], baseUnit: "ml" };
  }

  if (unitType === "weight" && WEIGHT_TO_G[normalized]) {
    return { value: quantity * WEIGHT_TO_G[normalized], baseUnit: "g" };
  }

  if (unitType === "count") {
    return { value: quantity, baseUnit: normalized };
  }

  return null;
}

export function convertFromBaseUnit(
  value: number,
  targetUnit: string
): number | null {
  const normalized = targetUnit.toLowerCase().trim();

  if (VOLUME_TO_ML[normalized]) {
    return value / VOLUME_TO_ML[normalized];
  }

  if (WEIGHT_TO_G[normalized]) {
    return value / WEIGHT_TO_G[normalized];
  }

  if (COUNT_UNITS.has(normalized)) {
    return value;
  }

  return null;
}

export function formatQuantity(qty: number): string {
  if (qty === 0) return "";

  // Handle common fractions
  const fractionMap: [number, string][] = [
    [0.125, "1/8"],
    [0.25, "1/4"],
    [0.333, "1/3"],
    [0.375, "3/8"],
    [0.5, "1/2"],
    [0.625, "5/8"],
    [0.667, "2/3"],
    [0.75, "3/4"],
    [0.875, "7/8"],
  ];

  const whole = Math.floor(qty);
  const fraction = qty - whole;

  // Find closest fraction match (within tolerance)
  let fractionStr = "";
  for (const [val, str] of fractionMap) {
    if (Math.abs(fraction - val) < 0.02) {
      fractionStr = str;
      break;
    }
  }

  if (whole === 0 && fractionStr) {
    return fractionStr;
  }

  if (whole > 0 && fractionStr) {
    return `${whole} ${fractionStr}`;
  }

  if (fraction === 0) {
    return whole.toString();
  }

  // Default: round to reasonable precision
  return qty % 1 === 0 ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, "");
}

export function chooseDisplayUnit(units: string[]): string {
  // Count occurrences of each unit
  const counts = new Map<string, number>();
  for (const unit of units) {
    const normalized = unit.toLowerCase().trim();
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  // Return most common unit
  let maxCount = 0;
  let mostCommon = units[0] || "";
  for (const [unit, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = unit;
    }
  }

  return mostCommon;
}
