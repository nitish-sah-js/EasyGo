/**
 * Used to wrap every route in an AnimatePresence-driven fade + slight rise,
 * keyed on the pathname. Removed: confirmed via WebKit that this exact
 * wrapper — a motion.div whose opacity/transform is driven by an
 * AnimatePresence exit/enter cycle on every client-side navigation — reaches
 * `opacity: 1` in computed style but never actually paints in Safari, making
 * the entire route's content invisible until something else forces a
 * browser repaint (e.g. a resize). Not scoped to any particular child
 * animation (whileInView vs mount-time) — even content with no animation of
 * its own was affected, since this wrapper sits above everything. A page
 * transition is a cosmetic nicety; making every route unusable in Safari is
 * not an acceptable trade for it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
