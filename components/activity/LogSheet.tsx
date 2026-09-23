"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import { displayDistanceToMetres } from "@/lib/units";
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

/**
 * The unit picked for THIS log entry -- separate from the profile-wide
 * units_preference (which is km/miles only, used to display route/progress
 * distances app-wide). Pool swims are usually measured in metres, so it's
 * offered here as a third option and remembered locally since whichever
 * unit someone logs in tends to stay the same every time.
 */
type LogUnits = UnitsPreference | "m";
const LOG_UNITS_STORAGE_KEY = "swirl:log-units";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function logUnitLabel(units: LogUnits): string {
  return units === "miles" ? "mi" : units === "m" ? "m" : "km";
}

export default function LogSheet({ unitsPreference, onSubmit, submitting }: LogSheetProps) {
  const [distance, setDistance] = useState("");
  const [units, setUnits] = useState<LogUnits>(unitsPreference);
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  // Deferred to an effect (rather than the useState initializer) so the
  // server-rendered markup matches the client's first paint -- localStorage
  // isn't available during SSR.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOG_UNITS_STORAGE_KEY);
      if (stored === "km" || stored === "miles" || stored === "m") setUnits(stored);
    } catch {
      // Private browsing / blocked storage -- fall back to unitsPreference.
    }
  }, []);

  function selectUnits(next: LogUnits) {
    setUnits(next);
    try {
      localStorage.setItem(LOG_UNITS_STORAGE_KEY, next);
    } catch {
      // Nothing to do if storage is unavailable -- the pick still applies this session.
    }
  }

  const distanceValue = parseFloat(distance);
  const canSubmit = Number.isFinite(distanceValue) && distanceValue > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    await onSubmit({
      distanceM: units === "m" ? distanceValue : displayDistanceToMetres(distanceValue, units),
      durationSeconds: duration ? Math.round(parseFloat(duration) * 60) : null,
      loggedAt: date,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            inputMode="decimal"
            step={units === "m" ? "1" : "0.1"}
            min="0"
            placeholder={units === "m" ? "0" : "0.0"}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-32 border-none bg-transparent font-display text-[56px] font-bold text-deep placeholder:text-mist focus:outline-none"
          />
          <span className="text-[22px] font-normal text-slate">{logUnitLabel(units)}</span>
        </div>

        <div className="flex w-fit rounded-pill bg-surface p-1">
          {(["km", "miles", "m"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectUnits(option)}
              className={clsx(
                "rounded-pill px-4 py-1.5 text-[12px] font-medium",
                units === option ? "bg-white text-deep shadow-card" : "text-slate"
              )}
            >
              {logUnitLabel(option)}
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
