"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { easeOut } from "@/lib/motion";

/**
 * Route-level fade + slight rise, keyed on the pathname so App Router treats
 * each route as a distinct exit/enter pair. Kept deliberately understated —
 * this runs on every navigation, so anything bigger reads as sluggish rather
 * than premium.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: easeOut }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
