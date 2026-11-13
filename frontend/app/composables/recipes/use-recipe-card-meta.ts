import { useRecipeTime } from "./use-recipe-time";

/** The fields a recipe card needs for its meta line; a RecipeSummary or Recipe satisfies it */
export interface RecipeCardMeta {
  totalTimeSeconds?: number | null;
  prepTimeSeconds?: number | null;
  performTimeSeconds?: number | null;
  totalTime?: string | null;
  recipeCategory?: { name: string }[] | null;
}

/** The text under a recipe card's title, e.g. "35 min · Dinner": time first, then the first category */
export function recipeCardMetaText(meta: RecipeCardMeta | null | undefined, shortTime: (meta: RecipeCardMeta) => string): string {
  if (!meta) {
    return "";
  }
  return [shortTime(meta), meta.recipeCategory?.[0]?.name].filter(Boolean).join(" · ");
}

export function useRecipeCardMeta() {
  const { recipeShortTime } = useRecipeTime();
  return {
    recipeCardMeta: (meta: RecipeCardMeta | null | undefined) => recipeCardMetaText(meta, recipeShortTime),
  };
}
