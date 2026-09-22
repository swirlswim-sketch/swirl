"use client";

import { useState } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import { displayDistanceToMetres, unitLabel } from "@/lib/units";
import type { UnitsPreference } from "@/types/database";

export interface LogSheetSubmission {
  distanceM: number;
  durationSeconds: number | null;
  loggedAt: string;
  notes: string | null;
}

interface LogSheetProps {
  unitsPreference: UnitsPreference;
  onSubmit: (data: LogSheetSubmission) => Promise<void> | void;
  submitting?: boolean;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogSheet({ unitsPreference, onSubmit, submitting }: LogSheetProps) {
  const [distance, setDistance] = useState("");
  const [units, setUnits] = useState<UnitsPreference>(unitsPreference);
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const distanceValue = parseFloat(distance);
  const canSubmit = Number.isFinite(distanceValue) && distanceValue > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    await onSubmit({
      distanceM: displayDistanceToMetres(distanceValue, units),
      durationSeconds: duration ? Math.round(parseFloat(duration) * 60) : null,
      loggedAt: date,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-32 border-none bg-transparent font-display text-[56px] font-bold text-deep placeholder:text-mist focus:outline-none"
          />
          <span className="text-[22px] font-normal text-slate">{unitLabel(units)}</span>
        </div>

        <div className="flex rounded-pill bg-surface p-1">
          {(["km", "miles"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnits(option)}
              className={clsx(
                "rounded-pill px-3 py-1 text-[12px] font-medium",
                units === option ? "bg-white text-deep shadow-card" : "text-slate"
              )}
            >
              {option === "km" ? "km" : "mi"}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-slate">Duration (minutes, optional)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="45"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-slate">Date</span>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep focus:border-blue focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-slate">Notes (optional)</span>
        <input
          type="text"
          placeholder="How did it feel?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
        />
      </label>

      <Button type="submit" fullWidth disabled={!canSubmit} loading={submitting}>
        Log it
      </Button>
    </form>
  );
}
