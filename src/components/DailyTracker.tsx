"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DAILY_SLOTS,
  DailyLog,
  DailyLogEntry,
  DailySlot,
  MEALS,
  MacroGoals,
  MealPlanData,
  Recipe,
} from "@/types/types";
import toast from "react-hot-toast";
import GoalsModal from "./GoalsModal";
import TrackerLogModal from "./TrackerLogModal";
import {
  addDays,
  dayKeyFromDate,
  dayOfWeekShort,
  fullDateLabel,
  shortMonthDay,
  startOfWeekMonday,
  todayLocal,
} from "@/lib/helpers/dates";
import { Macros, sumDailyLogEntries } from "@/lib/helpers/macros";

function recipeToEntry(
  r: Recipe,
  slot: DailySlot,
  loggedAt: string,
): DailyLogEntry {
  return {
    id: crypto.randomUUID(),
    slot,
    kind: "recipe",
    recipe_id: r.recipe_id,
    name: `${r.emoji ?? ""} ${r.name}`.trim(),
    servings: 1,
    calories: r.per_serving_calories ?? null,
    protein_g: r.per_serving_protein_g ?? null,
    fat_g: r.per_serving_fat_g ?? null,
    carbs_g: r.per_serving_carbs_g ?? null,
    sugar_g: r.per_serving_sugar_g ?? null,
    logged_at: loggedAt,
  };
}

const SLOT_LABEL: Record<DailySlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const SLOT_EMOJI: Record<DailySlot, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍝",
  snack: "🍿",
};

// ---------- Component ----------

const RECENTS_LIMIT = 15;
const RECENTS_LOOKBACK_DAYS = 14;

function computeRecents(logs: DailyLog[], limit: number): DailyLogEntry[] {
  const all = logs.flatMap((l) => l.entries);
  all.sort((a, b) => b.logged_at.localeCompare(a.logged_at));

  const seen = new Set<string>();
  const out: DailyLogEntry[] = [];
  for (const e of all) {
    const key =
      e.recipe_id != null
        ? `r:${e.recipe_id}`
        : `n:${e.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

type DailyTrackerProps = {
  initialDate?: string;
};

export default function DailyTracker({ initialDate }: DailyTrackerProps = {}) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : todayLocal(),
  );
  const [weekLogs, setWeekLogs] = useState<Record<string, DailyLog>>({});
  const [recentsLogs, setRecentsLogs] = useState<DailyLog[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [goals, setGoals] = useState<MacroGoals | null>(null);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [logModalSlot, setLogModalSlot] = useState<DailySlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekStart = useMemo(
    () => startOfWeekMonday(selectedDate),
    [selectedDate],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const todaysLog: DailyLog = useMemo(
    () =>
      weekLogs[selectedDate] ?? {
        log_date: selectedDate,
        entries: [],
      },
    [weekLogs, selectedDate],
  );

  const todaysTotals = useMemo(
    () => sumDailyLogEntries(todaysLog.entries),
    [todaysLog],
  );

  // Fetch goals on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/goals");
        if (!res.ok) return;
        const data = (await res.json()) as { goals: MacroGoals };
        if (!cancelled) setGoals(data.goals);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch recipes on mount (used by the log modal Recipe tab).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/get-recipes");
        if (!res.ok) return;
        const data = (await res.json()) as { recipes: Recipe[] };
        if (!cancelled) setRecipes(data.recipes ?? []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the last 14 days for Recents (one-time on mount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = todayLocal();
        const start = addDays(today, -(RECENTS_LOOKBACK_DAYS - 1));
        const res = await fetch(
          `/api/daily-log/range?start=${start}&end=${today}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { logs: DailyLog[] };
        if (!cancelled) setRecentsLogs(data.logs ?? []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recents = useMemo(
    () => computeRecents(recentsLogs, RECENTS_LIMIT),
    [recentsLogs],
  );

  // Fetch the visible week whenever the week shifts.
  const fetchWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = weekStart;
      const end = addDays(weekStart, 6);
      const res = await fetch(
        `/api/daily-log/range?start=${start}&end=${end}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load week");
      }
      const data = (await res.json()) as { logs: DailyLog[] };
      const next: Record<string, DailyLog> = {};
      for (const log of data.logs) next[log.log_date] = log;
      setWeekLogs(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  const handlePrevWeek = () => setSelectedDate((d) => addDays(d, -7));
  const handleNextWeek = () => setSelectedDate((d) => addDays(d, 7));
  const handleToday = () => setSelectedDate(todayLocal());

  const entriesForSlot = (slot: DailySlot) =>
    todaysLog.entries.filter((e) => e.slot === slot);

  const scheduleSave = useCallback((log: DailyLog) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaveStatus("saving");
    saveTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/daily-log", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(log),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, 1000);
  }, []);

  // Cancel any pending save when the component unmounts.
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const handleQuickAdd = (slot?: DailySlot) => {
    setLogModalSlot(slot ?? "breakfast");
  };

  const handleSubmitEntry = (entry: DailyLogEntry) => {
    const existing = weekLogs[selectedDate] ?? {
      log_date: selectedDate,
      entries: [],
    };
    const nextLog: DailyLog = {
      ...existing,
      log_date: selectedDate,
      entries: [...existing.entries, entry],
    };
    setWeekLogs((prev) => ({ ...prev, [selectedDate]: nextLog }));
    setRecentsLogs((prev) => {
      const todays = prev.find((l) => l.log_date === selectedDate);
      if (todays) {
        return prev.map((l) =>
          l.log_date === selectedDate
            ? { ...l, entries: [...l.entries, entry] }
            : l,
        );
      }
      return [...prev, { log_date: selectedDate, entries: [entry] }];
    });
    scheduleSave(nextLog);
  };

  const handleRemoveEntry = (id: string) => {
    const existing = weekLogs[selectedDate];
    if (!existing) return;
    const nextLog: DailyLog = {
      ...existing,
      entries: existing.entries.filter((e) => e.id !== id),
    };
    setWeekLogs((prev) => ({ ...prev, [selectedDate]: nextLog }));
    setRecentsLogs((prev) =>
      prev.map((l) =>
        l.log_date === selectedDate
          ? { ...l, entries: l.entries.filter((e) => e.id !== id) }
          : l,
      ),
    );
    scheduleSave(nextLog);
  };

  const handleCopyYesterday = async () => {
    const yesterday = addDays(selectedDate, -1);
    let yesterdayLog: DailyLog | undefined = weekLogs[yesterday];

    if (!yesterdayLog) {
      try {
        const res = await fetch(`/api/daily-log?date=${yesterday}`);
        if (res.ok) {
          const data = (await res.json()) as { log: DailyLog | null };
          yesterdayLog = data.log ?? undefined;
        }
      } catch {
        /* fall through */
      }
    }

    if (!yesterdayLog || yesterdayLog.entries.length === 0) {
      toast("Nothing to copy from yesterday");
      return;
    }

    const now = new Date().toISOString();
    const cloned: DailyLogEntry[] = yesterdayLog.entries.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      logged_at: now,
    }));

    const existing = weekLogs[selectedDate] ?? {
      log_date: selectedDate,
      entries: [],
    };
    const nextLog: DailyLog = {
      ...existing,
      log_date: selectedDate,
      entries: [...existing.entries, ...cloned],
    };

    setWeekLogs((prev) => ({ ...prev, [selectedDate]: nextLog }));
    scheduleSave(nextLog);
    toast.success(
      `Copied ${cloned.length} ${cloned.length === 1 ? "entry" : "entries"}`,
    );
  };

  const handleImportFromPlan = async () => {
    try {
      const res = await fetch("/api/meal-plan");
      if (!res.ok) {
        toast.error("Couldn't load meal plan");
        return;
      }
      const data = (await res.json()) as { plan: MealPlanData | null };
      if (!data.plan) {
        toast("No meal plan to import from");
        return;
      }

      const dayKey = dayKeyFromDate(selectedDate);
      const recipeMap = new Map(recipes.map((r) => [r.recipe_id, r]));
      const now = new Date().toISOString();
      const imported: DailyLogEntry[] = [];

      const dayPlan = data.plan.week?.[dayKey];
      if (dayPlan) {
        for (const meal of MEALS) {
          for (const id of dayPlan[meal]?.recipeIds ?? []) {
            const r = recipeMap.get(id);
            if (r) imported.push(recipeToEntry(r, meal, now));
          }
        }
      }

      for (const id of data.plan.snacks?.recipeIds ?? []) {
        const r = recipeMap.get(id);
        if (r) imported.push(recipeToEntry(r, "snack", now));
      }

      if (imported.length === 0) {
        toast("Nothing scheduled for this day in your meal plan");
        return;
      }

      const existing = weekLogs[selectedDate] ?? {
        log_date: selectedDate,
        entries: [],
      };
      const nextLog: DailyLog = {
        ...existing,
        log_date: selectedDate,
        entries: [...existing.entries, ...imported],
      };
      setWeekLogs((prev) => ({ ...prev, [selectedDate]: nextLog }));
      scheduleSave(nextLog);
      toast.success(
        `Imported ${imported.length} ${imported.length === 1 ? "entry" : "entries"} from meal plan`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    }
  };

  const handleClearDay = async () => {
    const existing = weekLogs[selectedDate];
    if (!existing || existing.entries.length === 0) {
      toast("This day is already empty");
      return;
    }
    if (!window.confirm("Clear all entries for this day?")) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaveStatus("saving");
    setWeekLogs((prev) => ({
      ...prev,
      [selectedDate]: { log_date: selectedDate, entries: [] },
    }));
    setRecentsLogs((prev) =>
      prev.map((l) =>
        l.log_date === selectedDate ? { ...l, entries: [] } : l,
      ),
    );

    try {
      const res = await fetch(
        `/api/daily-log?date=${selectedDate}`,
        { method: "DELETE" },
      );
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <>
      <GoalsModal
        isOpen={goalsModalOpen}
        initialGoals={goals}
        onClose={() => setGoalsModalOpen(false)}
        onSaved={(g) => setGoals(g)}
      />

      <TrackerLogModal
        isOpen={logModalSlot !== null}
        defaultSlot={logModalSlot ?? "breakfast"}
        recipes={recipes}
        recents={recents}
        onClose={() => setLogModalSlot(null)}
        onSubmit={handleSubmitEntry}
      />

      <section className="border border-border rounded-3xl p-6 bg-surface space-y-5">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl text-text font-bold">📊 Daily Tracker</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {fullDateLabel(selectedDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saveStatus !== "idle" && (
              <span
                className={`text-xs font-medium ${
                  saveStatus === "saving"
                    ? "text-text-secondary"
                    : saveStatus === "saved"
                      ? "text-green-600"
                      : "text-red-500"
                }`}
              >
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "Saved"
                    : "Save Failed"}
              </span>
            )}
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl font-semibold text-text transition-all"
            >
              Today
            </button>
            <button
              onClick={() => setGoalsModalOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl font-bold text-text transition-all"
            >
              {hasAnyGoal(goals) ? "Edit Goals" : "Set Goals"}
            </button>
          </div>
        </header>

        {/* Week strip */}
        <nav
          aria-label="Day navigator"
          className="flex items-center gap-1 border border-border rounded-2xl bg-muted/20 p-2"
        >
          <button
            onClick={handlePrevWeek}
            aria-label="Previous week"
            className="p-2 rounded-xl hover:bg-muted text-text"
          >
            ◀
          </button>

          <ol className="flex-1 grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const isActive = d === selectedDate;
              const hasEntries = (weekLogs[d]?.entries?.length ?? 0) > 0;
              return (
                <li key={d}>
                  <button
                    onClick={() => setSelectedDate(d)}
                    aria-current={isActive ? "date" : undefined}
                    className={`w-full flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${
                      isActive
                        ? "bg-primary text-text shadow-sm"
                        : "text-text-secondary hover:bg-muted hover:text-text"
                    }`}
                  >
                    <span className="text-xs font-bold tracking-wide">
                      {dayOfWeekShort(d)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {shortMonthDay(d)}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasEntries ? "bg-emerald-500" : "bg-text-secondary/30"
                      }`}
                      aria-label={hasEntries ? "Logged" : "No log"}
                    />
                  </button>
                </li>
              );
            })}
          </ol>

          <button
            onClick={handleNextWeek}
            aria-label="Next week"
            className="p-2 rounded-xl hover:bg-muted text-text"
          >
            ▶
          </button>
        </nav>

        {error && (
          <div className="border border-red-500/40 bg-red-500/10 rounded-xl px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Totals + Goals */}
        <div className="grid gap-3 sm:grid-cols-2">
          <TotalsCard totals={todaysTotals} goals={goals} />
          <GoalsCard totals={todaysTotals} goals={goals} />
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAdd()}
            className="px-4 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-all"
          >
            + Quick Add
          </button>
          <button
            onClick={handleCopyYesterday}
            className="px-4 py-2 bg-surface hover:bg-muted border border-border rounded-xl font-semibold text-text transition-all"
          >
            Copy yesterday
          </button>
          <button
            onClick={handleImportFromPlan}
            className="px-4 py-2 bg-surface hover:bg-muted border border-border rounded-xl font-semibold text-text transition-all"
          >
            Import from meal plan
          </button>
          <button
            onClick={handleClearDay}
            className="px-4 py-2 bg-surface hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/40 border border-border rounded-xl font-semibold text-text-secondary transition-all ml-auto"
          >
            Clear day
          </button>
          {loading && (
            <span className="text-xs text-text-secondary self-center ml-2">
              Loading…
            </span>
          )}
        </div>

        {/* Slot sections */}
        <div className="space-y-3">
          {DAILY_SLOTS.map((slot) => (
            <SlotSection
              key={slot}
              slot={slot}
              entries={entriesForSlot(slot)}
              onAdd={() => handleQuickAdd(slot)}
              onRemove={handleRemoveEntry}
            />
          ))}
        </div>
      </section>
    </>
  );
}

// ---------- Subcomponents ----------

function hasAnyGoal(g: MacroGoals | null): boolean {
  if (!g) return false;
  return (
    g.calories != null ||
    g.protein_g != null ||
    g.fat_g != null ||
    g.carbs_g != null
  );
}

function TotalsCard({
  totals,
  goals,
}: {
  totals: Macros;
  goals: MacroGoals | null;
}) {
  const remaining =
    goals?.calories != null
      ? Math.max(0, goals.calories - totals.calories)
      : null;

  return (
    <div className="border border-border rounded-2xl p-4 bg-muted/20">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-bold text-text">Today</h3>
        {remaining != null && (
          <span className="text-xs text-text-secondary tabular-nums">
            {remaining} cal remaining
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-text tabular-nums">
        {totals.calories}
        <span className="text-sm font-normal text-text-secondary ml-1">
          cal
        </span>
      </p>
      <p className="text-sm text-text-secondary mt-1 tabular-nums">
        {totals.protein}g P · {totals.fat}g F · {totals.carbs}g C
      </p>
    </div>
  );
}

function GoalsCard({
  totals,
  goals,
}: {
  totals: Macros;
  goals: MacroGoals | null;
}) {
  if (!hasAnyGoal(goals)) {
    return (
      <div className="border border-dashed border-border rounded-2xl p-4 bg-muted/10 flex flex-col items-start justify-center text-sm text-text-secondary">
        <p className="font-semibold text-text mb-1">No goals set</p>
        <p>Set daily targets to see progress here.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl p-4 bg-muted/20 space-y-2">
      <h3 className="font-bold text-text mb-1">Goals</h3>
      <ProgressRow
        label="Calories"
        value={totals.calories}
        goal={goals?.calories ?? null}
        unit=""
      />
      <ProgressRow
        label="Protein"
        value={totals.protein}
        goal={goals?.protein_g ?? null}
        unit="g"
      />
      <ProgressRow
        label="Fat"
        value={totals.fat}
        goal={goals?.fat_g ?? null}
        unit="g"
      />
      <ProgressRow
        label="Carbs"
        value={totals.carbs}
        goal={goals?.carbs_g ?? null}
        unit="g"
      />
    </div>
  );
}

function ProgressRow({
  label,
  value,
  goal,
  unit,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit: string;
}) {
  if (goal == null) {
    return (
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {unit} · no goal
        </span>
      </div>
    );
  }

  const pct = goal === 0 ? 0 : Math.min(100, Math.round((value / goal) * 100));
  const over = value > goal;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-text">{label}</span>
        <span className="tabular-nums text-text-secondary">
          <span className="font-bold text-text">{value}</span> / {goal}
          {unit && ` ${unit}`}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
        aria-label={`${label} progress`}
      >
        <div
          className={`h-full rounded-full transition-all ${
            over ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SlotSection({
  slot,
  entries,
  onAdd,
  onRemove,
}: {
  slot: DailySlot;
  entries: DailyLogEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const totals = sumDailyLogEntries(entries);
  return (
    <section className="border border-border rounded-2xl bg-surface overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">{SLOT_EMOJI[slot]}</span>
          <h4 className="font-bold text-text">{SLOT_LABEL[slot]}</h4>
        </div>
        <span className="text-sm text-text-secondary tabular-nums">
          {totals.calories === 0 ? (
            "—"
          ) : (
            <>
              <span className="font-bold text-text">{totals.calories}</span>{" "}
              cal · {totals.protein}P · {totals.fat}F · {totals.carbs}C
            </>
          )}
        </span>
      </header>

      <ol className="divide-y divide-border/40">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">
                {e.name}
              </p>
              <p className="text-xs text-text-secondary tabular-nums">
                ×{e.servings.toFixed(2).replace(/\.?0+$/, "")}
                {e.calories != null && ` · ${Math.round(e.calories)} cal`}
                {e.protein_g != null && ` · ${Math.round(e.protein_g)}P`}
                {e.fat_g != null && ` · ${Math.round(e.fat_g)}F`}
                {e.carbs_g != null && ` · ${Math.round(e.carbs_g)}C`}
              </p>
            </div>
            <button
              onClick={() => onRemove(e.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove entry"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      <button
        onClick={onAdd}
        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-muted/30 hover:text-text transition-colors"
      >
        + Add to {SLOT_LABEL[slot].toLowerCase()}
      </button>
    </section>
  );
}
