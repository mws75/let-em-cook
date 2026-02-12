export const CATEGORY_COLORS: Record<string, string> = {
  breakfast: "#FFD180",
  lunch: "#81D4FA",
  dinner: "#CE93D8",
  snack: "#A5D6A7",
  dessert: "#F48FB1",
  chicken: "#FFCC80",
  beef: "#EF9A9A",
  pork: "#FFAB91",
  fish: "#80DEEA",
  seafood: "#80CBC4",
  soup: "#FFF59D",
  pasta: "#FFE082",
  salad: "#66BB6A",
  vegetarian: "#C5E1A5",
  vegan: "#69F0AE",
  "gluten free": "#B0BEC5",
  "dairy free": "#B3E5FC",
  keto: "#FFCDD2",
  "low carb": "#D7CCC8",
  "slow cooker": "#BCAAA4",
  "meal prep": "#90CAF9",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || "#E0E0E0";
}
