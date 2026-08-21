"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Snowflake } from "lucide-react";
import {
  TRAIN_CLASS_CODES,
  TRAIN_CLASS_INFO,
  formatInr,
  type TrainAvailabilityStatus,
  type TrainClassCode,
  type TrainClassOption,
} from "@nexttour/shared";
import { Chip, FilterChip, type ChipTone } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const AC_CODES = TRAIN_CLASS_CODES.filter((code) => TRAIN_CLASS_INFO[code].ac);
const NON_AC_CODES = TRAIN_CLASS_CODES.filter((code) => !TRAIN_CLASS_INFO[code].ac);

const availabilityTone: Record<TrainAvailabilityStatus, ChipTone> = {
  AVAILABLE: "success",
  RAC: "mid",
  WAITLIST: "mid",
  NOT_AVAILABLE: "danger",
  UNKNOWN: "neutral",
};

const availabilityLabel: Record<TrainAvailabilityStatus, string> = {
  AVAILABLE: "Available",
  RAC: "RAC",
  WAITLIST: "Waitlist",
  NOT_AVAILABLE: "Not available",
  UNKNOWN: "Check availability",
};

function withCount(label: string, count: number | undefined): string {
  return typeof count === "number" ? `${label} ${count}` : label;
}

/**
 * Search-time AC/Non-AC + class preference. There is no fare or availability
 * here yet, and no per-class search to call — redBus's own train search
 * returns every class on one card — so this only decides which class chip
 * the results screen starts on for each train.
 */
export function TrainClassPreferencePicker({
  value,
  onChange,
}: {
  value: TrainClassCode | undefined;
  onChange: (value: TrainClassCode | undefined) => void;
}) {
  const [ac, setAc] = useState(() => (value ? TRAIN_CLASS_INFO[value].ac : true));
  const codes = ac ? AC_CODES : NON_AC_CODES;

  function selectGroup(nextAc: boolean) {
    setAc(nextAc);
    if (value && TRAIN_CLASS_INFO[value].ac !== nextAc) onChange(undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <FilterChip type="button" active={ac} onClick={() => selectGroup(true)}>
          <Snowflake className="h-3.5 w-3.5" />
          AC
        </FilterChip>
        <FilterChip type="button" active={!ac} onClick={() => selectGroup(false)}>
          Non-AC
        </FilterChip>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip type="button" active={!value} onClick={() => onChange(undefined)}>
          Any class
        </FilterChip>
        {codes.map((code) => {
          const info = TRAIN_CLASS_INFO[code];
          return (
            <FilterChip
              key={code}
              type="button"
              active={value === code}
              onClick={() => onChange(code)}
              title={info.description}
            >
              {info.label}
            </FilterChip>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Per-train class chips for the results screen: real fare and (best-effort)
 * availability per class, sourced from `TransportOption.trainClasses`.
 * A class is only ever disabled on a confidently-parsed NOT_AVAILABLE status.
 */
export function TrainClassChips({
  classes,
  selected,
  onSelect,
}: {
  classes: TrainClassOption[];
  selected: TrainClassCode | undefined;
  onSelect: (code: TrainClassCode) => void;
}) {
  // Scopes the sliding highlight's layoutId to this segment's own chip row —
  // without it, every segment's TrainClassChips on the results screen would
  // share one layoutId and the highlight would leap between unrelated cards.
  const groupId = useId();

  return (
    <div className="flex flex-wrap gap-1.5">
      {classes.map((trainClass) => {
        const isSelected = selected === trainClass.code;
        const disabled = trainClass.availability === "NOT_AVAILABLE";
        return (
          <motion.button
            key={trainClass.code}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onSelect(trainClass.code)}
            whileTap={disabled ? {} : { scale: 0.96 }}
            title={TRAIN_CLASS_INFO[trainClass.code].description}
            className={cn(
              "relative flex min-w-[6.5rem] flex-col items-start gap-1 overflow-hidden rounded-xl border px-3 py-2 text-left",
              "transition-colors duration-200 ease-out hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
              isSelected
                ? "border-accent-500 bg-accent-50 ring-1 ring-accent-200"
                : "border-border bg-surface hover:border-brand-300 hover:bg-brand-50",
            )}
          >
            {isSelected ? (
              <motion.span
                layoutId={`train-class-glow-${groupId}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent-100/70 to-transparent"
              />
            ) : null}
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {trainClass.ac ? <Snowflake className="h-3.5 w-3.5 text-brand-600" /> : null}
              {trainClass.label}
            </span>
            <span className="text-sm font-bold tabular-nums text-foreground">{formatInr(trainClass.fare)}</span>
            <Chip tone={availabilityTone[trainClass.availability]} className="text-[0.65rem]">
              {withCount(availabilityLabel[trainClass.availability], trainClass.availableCount)}
            </Chip>
          </motion.button>
        );
      })}
    </div>
  );
}
