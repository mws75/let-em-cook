// Re-export all database functions for convenient imports
// Usage: import { countUserRecipes, getRecipes } from "@/lib/database"
// Note: For auth, use "@/lib/auth" instead (getAuthenticatedUserId, getAuthenticatedUser)

export * from "./connection";
export * from "./users";
export * from "./recipes";
export * from "./contact";
export * from "./engagement";
export * from "./categories";
