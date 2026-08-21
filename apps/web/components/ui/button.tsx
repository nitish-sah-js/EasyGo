import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-lavender-700 text-white shadow-card hover:bg-lavender-800",
        secondary: "border border-lavender-200 bg-surface text-lavender-800 hover:bg-lavender-50",
        outline: "border border-lavender-300 bg-transparent text-lavender-700 hover:bg-lavender-50",
        ghost: "text-lavender-700 hover:bg-lavender-100",
        onInk: "bg-white/15 text-white ring-1 ring-inset ring-white/30 backdrop-blur hover:bg-white/25",
        danger: "bg-blush-600 text-white shadow-card hover:bg-blush-700",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-[0.8rem]",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10 px-0",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, shape, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";
