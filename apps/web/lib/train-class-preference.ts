/**
 * sessionStorage key the search panel writes a chosen train class to, and the
 * trip result page reads back to pre-select a matching class chip per train.
 * Purely a UI default: redBus's own train search returns every class on one
 * card, so this never changes what's fetched, only what's highlighted first.
 */
export const TRAIN_CLASS_PREFERENCE_KEY = "nexttour:trainClassPreference";
