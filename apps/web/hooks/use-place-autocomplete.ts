import { useQuery } from "@tanstack/react-query";
import type { PlaceSuggestion } from "@nexttour/shared";
import { apiFetch } from "@/lib/api";
import { useDebouncedValue } from "./use-debounced-value";

const MIN_INPUT_LENGTH = 2;
const DEBOUNCE_MS = 300;

/**
 * `sessionToken` groups an autocomplete typeahead burst with the eventual
 * selection for Google's billing purposes. It is not part of the query key —
 * a fresh token per keystroke would defeat react-query's cache for the exact
 * same reason it's excluded from the server's response cache key.
 */
export function usePlaceAutocomplete(input: string, sessionToken: string) {
  const trimmed = input.trim();
  const debounced = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const enabled = debounced.length >= MIN_INPUT_LENGTH;

  const query = useQuery({
    queryKey: ["places", "autocomplete", debounced],
    queryFn: () =>
      apiFetch<{ suggestions: PlaceSuggestion[] }>(
        `/api/places/autocomplete?input=${encodeURIComponent(debounced)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      ),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  // Inside the debounce window the results still describe the *previous* input.
  // Withholding them stops a fast click from selecting a place the user has
  // already typed past.
  const settled = trimmed === debounced;

  return {
    suggestions: enabled && settled ? (query.data?.suggestions ?? []) : [],
    isLoading: trimmed.length >= MIN_INPUT_LENGTH && (!settled || query.isFetching || query.isLoading),
    isError: enabled && settled && query.isError,
  };
}
