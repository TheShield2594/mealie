import type { RecipeIngredient } from "~/lib/api/types/recipe";
import { useIngredientTextParser } from "~/composables/recipes";

function normalize(word: string): string {
  let normalizing = word;
  normalizing = removeTrailingPunctuation(normalizing);
  normalizing = removeStartingPunctuation(normalizing);
  return normalizing;
}

function removeTrailingPunctuation(word: string): string {
  const punctuationAtEnding = /\p{P}+$/u;
  return word.replace(punctuationAtEnding, "");
}

function removeStartingPunctuation(word: string): string {
  const punctuationAtBeginning = /^\p{P}+/u;
  return word.replace(punctuationAtBeginning, "");
}

function isBlackListedWord(word: string) {
  // Ignore matching blacklisted words when auto-linking - This is kind of a cludgey implementation. We're blacklisting common words but
  // other common phrases trigger false positives and I'm not sure how else to approach this. In the future I maybe look at looking directly
  // at the food variable and seeing if the food is in the instructions, but I still need to support those who don't want to provide the value
  // and only use the "notes" feature.
  const blackListedText: string[] = [
    "and",
    "the",
    "for",
    "with",
    "without",
  ];
  const blackListedRegexMatch = /\d/gm; // Match Any Number
  return blackListedText.includes(word) || word.match(blackListedRegexMatch);
}

function wordsMatch(a: string, b: string) {
  if (a === b) {
    return true;
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return longer === `${shorter}s` || longer === `${shorter}es`;
}

export function useExtractIngredientReferences() {
  const { parseIngredientText } = useIngredientTextParser();

  function extractIngredientReferences(recipeIngredients: RecipeIngredient[], activeRefs: string[], text: string): Set<string> {
    // Whole words only, allowing for a plural on either side: "onion" finds "Onions", but "pot"
    // no longer finds "potatoes" and "oil" no longer finds "boiled"
    function ingredientMatchesWord(ingredient: RecipeIngredient, word: string) {
      const target = word.toLowerCase();
      const ingredientWords = parseIngredientText(ingredient)
        .toLowerCase()
        .split(/[^\p{L}\p{N}']+/u)
        .filter(Boolean);
      return ingredientWords.some(candidate => wordsMatch(candidate, target));
    }

    const availableIngredients = recipeIngredients
      .filter(ingredient => ingredient.referenceId !== undefined)
      .filter(ingredient => !activeRefs.includes(ingredient.referenceId as string));

    const allMatchedIngredientIds: string[] = text
      .toLowerCase()
      .split(/\s/)
      .map(normalize)
      .filter(word => word.length > 2)
      .filter(word => !isBlackListedWord(word))
      .flatMap(word => availableIngredients.filter(ingredient => ingredientMatchesWord(ingredient, word)))
      .map(ingredient => ingredient.referenceId as string);
    //  deduplicate

    return new Set<string>(allMatchedIngredientIds);
  }

  return {
    extractIngredientReferences,
  };
}
