import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The one button scale for the whole site.
 *
 * Three tiers, and the tier is chosen by *importance of the action*, never by
 * how much room happens to be left in a layout:
 *
 *   lg      56px  primary   — the single action a screen exists for
 *                             (Start planning, Plan my trip, Book, Confirm)
 *   default 48px  secondary — supporting actions that are still full sentences
 *                             (View my trips, Details, Save, Back / Next)
 *   sm      44px  compact   — dense rows and the header bar, where a 48px
 *                             control would crowd its neighbours
 *   xs      36px  utility   — filters, sort, pagination, chips
 *   icon    44px  icon-only — square, never widened to "look important"
 *   iconSm  36px  icon-only — close buttons, map controls
 *
 * Everything below the size table (radius, motion, focus ring, icon size, icon
 * gap) is deliberately shared across every tier: the tiers differ in weight,
 * not in design language.
 */
const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center whitespace-nowrap",
    "font-semibold",
    // Only the properties that actually change are transitioned, so the lift
    // never fights the layout.
    "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out",
    // Icons are sized by the button, not by the call site, which is what keeps
    // a 16px lucide icon from turning up next to a 20px one on the same row.
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Shared motion language: lift on hover, press in on click.
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:duration-75",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
  ],
  {
    variants: {
      variant: {
        // Primary Orange gradient — the one action a screen exists for
        // (Start Planning, Plan My Trip, Search, Book Now, Confirm...).
        default: "bg-primary-orange text-white shadow-card hover:bg-warm-orange hover:shadow-glow",
        // Purple-tinted outline, not a gradient fill — kept light on purpose so
        // it never competes with the orange primary action on the same screen.
        secondary:
          "border border-brand-200 bg-surface text-brand-800 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:shadow-card",
        outline:
          "border border-brand-300 bg-transparent text-brand-700 hover:border-brand-400 hover:bg-brand-50 hover:shadow-card",
        ghost: "text-brand-700 hover:bg-brand-100",
        /** Primary Orange gradient — the primary CTA when it sits on an ink panel or hero photo. */
        onInkSolid: "bg-primary-orange text-white shadow-ink hover:bg-warm-orange hover:shadow-glow",
        /** Translucent — the *supporting* action in those same dark contexts. */
        onInk:
          "bg-white/15 text-white ring-1 ring-inset ring-white/30 backdrop-blur hover:bg-white/25 hover:ring-white/40",
        danger: "bg-blush-600 text-white shadow-card hover:bg-blush-700 hover:shadow-lift",
      },
      size: {
        lg: "h-14 gap-2.5 rounded-[14px] px-8 text-[1.0625rem] font-bold [&_svg]:h-5 [&_svg]:w-5",
        default:
          "h-12 gap-2 rounded-[14px] px-6 text-base [&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem]",
        sm: "h-11 gap-2 rounded-[12px] px-5 text-[0.9375rem] [&_svg]:h-[1.05rem] [&_svg]:w-[1.05rem]",
        xs: "h-9 gap-1.5 rounded-[12px] px-3.5 text-sm [&_svg]:h-4 [&_svg]:w-4",
        icon: "h-11 w-11 rounded-[12px] px-0 [&_svg]:h-[1.15rem] [&_svg]:w-[1.15rem]",
        iconSm: "h-9 w-9 rounded-[12px] px-0 [&_svg]:h-4 [&_svg]:w-4",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
      /**
       * Primary calls to action span the container on phones — a 56px button
       * floating at 40% width reads as an afterthought on a narrow screen.
       * Opt in per call site; it is wrong for buttons that share a row.
       */
      block: {
        true: "w-full",
        responsive: "w-full sm:w-auto",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
      block: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, block, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, shape, block, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
