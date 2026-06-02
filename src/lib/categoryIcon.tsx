import React from "react";
import {
  Egg,
  Sandwich,
  Utensils,
  Cookie,
  CakeSlice,
  ChefHat,
  Beef,
  Ham,
  Fish,
  Soup,
  Salad,
  LeafyGreen,
  WheatOff,
  MilkOff,
  Flame,
  CookingPot,
  ClipboardList,
  type LucideProps,
} from "lucide-react";

type IconComponent = React.ComponentType<LucideProps>;

const categoryIconMap: Record<string, IconComponent> = {
  breakfast: Egg,
  lunch: Sandwich,
  dinner: Utensils,
  snack: Cookie,
  dessert: CakeSlice,
  chicken: ChefHat,
  beef: Beef,
  pork: Ham,
  fish: Fish,
  seafood: Fish,
  soup: Soup,
  pasta: Utensils,
  salad: Salad,
  vegetarian: LeafyGreen,
  vegan: LeafyGreen,
  "gluten free": WheatOff,
  "dairy free": MilkOff,
  keto: Flame,
  "low carb": Flame,
  "slow cooker": CookingPot,
  "meal prep": ClipboardList,
};

export function getCategoryIcon(
  category: string,
  props?: LucideProps,
): React.ReactElement {
  const Icon = categoryIconMap[category?.toLowerCase()] ?? ChefHat;
  return <Icon {...props} />;
}
