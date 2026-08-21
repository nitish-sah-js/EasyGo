"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Landmark, MapPin, Plane, TrainFront } from "lucide-react";
import type { PlaceSuggestion, PlaceSuggestionCategory } from "@nexttour/shared";
import { usePlaceAutocomplete } from "@/hooks/use-place-autocomplete";
import { dropdown } from "@/lib/motion";
import { cn } from "@/lib/utils";

const categoryIcon: Record<PlaceSuggestionCategory, typeof MapPin> = {
  city: MapPin,
  airport: Plane,
  train_station: TrainFront,
  hotel: Building2,
  attraction: Landmark,
  other: MapPin,
};

function randomSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires with the picked place, or `null` once the text no longer matches it. */
  onSelect: (suggestion: PlaceSuggestion | null) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  id?: string;
}

/**
 * A single Origin/Destination field: plain text input plus a live Google
 * Places dropdown underneath. Deliberately renders bare (no border/label) so
 * it can drop into `PanelField`'s existing box unchanged — this only replaces
 * the `<input>`, not its container.
 */
export function PlaceAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  ariaLabel,
  className,
  id,
}: PlaceAutocompleteInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef(randomSessionToken());
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const { suggestions, isLoading } = usePlaceAutocomplete(value, sessionTokenRef.current);

  // Typing away from a previously picked suggestion invalidates it — the free
  // text left behind must not silently keep the old place's id attached.
  useEffect(() => {
    if (selectedText !== null && value !== selectedText) {
      setSelectedText(null);
      onSelect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function pick(suggestion: PlaceSuggestion) {
    // `mainText`, not the full `description`: origin/destination are capped at
    // 80 chars by the trip-planning schema and are resolved as place names by
    // the transport/city providers, which a full formatted address breaks. The
    // precise identity of the pick is carried by `placeId` on the suggestion.
    onChange(suggestion.mainText);
    setSelectedText(suggestion.mainText);
    onSelect(suggestion);
    setOpen(false);
    // Selecting ends this billing session — the next keystroke starts a new one.
    sessionTokenRef.current = randomSessionToken();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showDropdown) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }

    if (!showDropdown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length > 0) setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length > 0) setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      // The dropdown is open — Enter belongs to it, not to a native form
      // submit, even while suggestions are still loading. Falls through to
      // the first suggestion when the user hasn't arrow-keyed to one yet.
      event.preventDefault();
      const target = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      if (target) pick(target);
    }
  }

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative">
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={`${inputId}-listbox`}
        aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
      />

      <AnimatePresence>
        {showDropdown ? (
        <motion.div
          id={`${inputId}-listbox`}
          role="listbox"
          aria-label={`${ariaLabel} suggestions`}
          variants={dropdown}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ transformOrigin: "top" }}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 min-w-[18rem] overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-panel"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              Searching places…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">
              No places found for &ldquo;{value.trim()}&rdquo;
            </div>
          ) : (
            <ul>
              {suggestions.map((suggestion, index) => {
                const Icon = categoryIcon[suggestion.category];
                const active = index === activeIndex;
                return (
                  <li key={suggestion.placeId} role="presentation">
                    <button
                      id={`${inputId}-option-${index}`}
                      role="option"
                      aria-selected={active}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(suggestion)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                        active && "bg-brand-100 ring-1 ring-inset ring-brand-300",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                          active ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {suggestion.mainText}
                        </span>
                        {suggestion.secondaryText ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {suggestion.secondaryText}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
