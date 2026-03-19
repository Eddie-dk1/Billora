"use client";

import { useMemo, useState } from "react";

type RecurrencePreset = "weekly" | "monthly" | "yearly" | "custom";

function presetFromRule(interval: number, unit: string): RecurrencePreset {
  if (interval === 1 && unit === "week") {
    return "weekly";
  }

  if (interval === 1 && unit === "month") {
    return "monthly";
  }

  if (interval === 1 && unit === "year") {
    return "yearly";
  }

  return "custom";
}

function ruleFromPreset(preset: RecurrencePreset): { interval: number; unit: "day" | "week" | "month" | "year" } {
  if (preset === "weekly") {
    return { interval: 1, unit: "week" };
  }

  if (preset === "monthly") {
    return { interval: 1, unit: "month" };
  }

  if (preset === "yearly") {
    return { interval: 1, unit: "year" };
  }

  return { interval: 1, unit: "month" };
}

export function RecurrenceFields({
  initialInterval,
  initialUnit,
}: {
  initialInterval: number;
  initialUnit: "day" | "week" | "month" | "year";
}) {
  const initialPreset = useMemo(() => presetFromRule(initialInterval, initialUnit), [initialInterval, initialUnit]);
  const [preset, setPreset] = useState<RecurrencePreset>(initialPreset);
  const [customInterval, setCustomInterval] = useState(initialInterval);
  const [customUnit, setCustomUnit] = useState<"day" | "week" | "month" | "year">(initialUnit);

  const effectiveRule = preset === "custom" ? { interval: customInterval, unit: customUnit } : ruleFromPreset(preset);

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-[var(--ink)]">Recurrence preset</span>
        <select
          value={preset}
          onChange={(event) => setPreset(event.target.value as RecurrencePreset)}
          className="field-select"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {preset === "custom" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Custom interval</span>
            <input
              type="number"
              min={1}
              max={365}
              value={customInterval}
              onChange={(event) => setCustomInterval(Number(event.target.value || 1))}
              className="field-input"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Custom unit</span>
            <select
              value={customUnit}
              onChange={(event) => setCustomUnit(event.target.value as "day" | "week" | "month" | "year")}
              className="field-select"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </label>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
          Using preset: every {effectiveRule.interval} {effectiveRule.unit}
        </div>
      )}

      <input type="hidden" name="recurrenceInterval" value={String(effectiveRule.interval)} />
      <input type="hidden" name="recurrenceUnit" value={effectiveRule.unit} />
    </div>
  );
}
