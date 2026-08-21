import * as React from "react";
import { Chip, type ChipTone } from "@/components/ui/chip";

export function Badge(props: React.HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return <Chip {...props} />;
}
