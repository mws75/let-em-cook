// Subtle pastel palette — designed to be readable when used as a flat tile
// background. Each color sits around 88-92% lightness so dark text stays
// legible without any extra treatment.
export const CATEGORY_COLORS: Record<string, string> = {
  breakfast: "#FFE5B4", // peach
  lunch: "#D5EAF7", // sky
  dinner: "#E2D1EA", // lavender
  snack: "#D5E8D6", // mint
  dessert: "#F4D4DF", // rose
  chicken: "#FFE7C2", // warm peach
  beef: "#F2D2D2", // dusty rose
  pork: "#FADAD0", // salmon
  fish: "#D2E8EB", // aqua
  seafood: "#D3E2DD", // sea green
  soup: "#FFF3C4", // butter
  pasta: "#FFEBC2", // gold
  salad: "#DDEBD3", // leaf
  vegetarian: "#E2EAD0", // sage
  vegan: "#D2EDD9", // fresh mint
  "gluten free": "#DCE2E6", // slate
  "dairy free": "#DCEEF7", // pale cyan
  keto: "#F2DCDD", // powder pink
  "low carb": "#E8E1DF", // warm gray
  "slow cooker": "#DED4D0", // taupe
  "meal prep": "#D2DEEE", // cornflower
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || "#ECECEC";
}

export const DEFAULT_CATEGORY_LIST: { name: string; color_hex: string }[] =
  Object.entries(CATEGORY_COLORS).map(([name, color_hex]) => ({
    name,
    color_hex,
  }));
