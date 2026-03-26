"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import React, { useState, useEffect, useRef, useCallback } from "react";

/* ───────────────────────────────────────────
   Intersection Observer hook for scroll reveal
   ─────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ───────────────────────────────────────────
   Demo step data
   ─────────────────────────────────────────── */
const DEMO_STEPS = [
  {
    title: "Add a Recipe",
    accent: "bg-primary",
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-surface border-2 border-border rounded-2xl p-3">
          <div className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center text-lg">
            🍝
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text text-sm">
              Garlic Butter Pasta
            </p>
            <p className="text-text-secondary text-xs">
              420 cal · 12g protein · 15 min
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-surface border-2 border-border rounded-2xl p-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/40 flex items-center justify-center text-lg">
            🥗
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text text-sm">
              Chicken Caesar Salad
            </p>
            <p className="text-text-secondary text-xs">
              380 cal · 32g protein · 10 min
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center">
            <span className="text-text-secondary text-xs">+</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-surface border-2 border-border rounded-2xl p-3 opacity-60">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-lg">
            🌮
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text text-sm">Fish Tacos</p>
            <p className="text-text-secondary text-xs">
              510 cal · 28g protein · 20 min
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center">
            <span className="text-text-secondary text-xs">+</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Plan Your Week",
    accent: "bg-secondary",
    content: (
      <div className="space-y-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
          <div
            key={day}
            className="flex items-center gap-3 bg-surface border-2 border-border rounded-2xl p-2.5"
          >
            <span className="text-xs font-bold text-text-secondary w-8">
              {day}
            </span>
            <div className="flex-1 flex gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  i < 3
                    ? "bg-primary/20 text-text"
                    : "bg-border/50 text-text-secondary"
                }`}
              >
                {
                  ["🍝 Pasta", "🥗 Salad", "🌮 Tacos", "...", "..."][
                    i
                  ]
                }
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  i < 2
                    ? "bg-secondary/30 text-text"
                    : "bg-border/50 text-text-secondary"
                }`}
              >
                {
                  [
                    "🥑 Avocado Toast",
                    "🍲 Soup",
                    "...",
                    "...",
                    "...",
                  ][i]
                }
              </span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Get Grocery List",
    accent: "bg-accent",
    content: (
      <div className="space-y-2">
        {[
          { cat: "Produce", items: ["Garlic (1 bulb)", "Romaine (2 heads)", "Avocados (3)"] },
          { cat: "Protein", items: ["Chicken breast (2 lb)", "White fish (1 lb)"] },
          { cat: "Pantry", items: ["Spaghetti (1 box)", "Olive oil", "Tortillas (8 ct)"] },
        ].map((group) => (
          <div key={group.cat}>
            <p className="text-xs font-bold text-text-secondary mb-1 ml-1">
              {group.cat}
            </p>
            <div className="bg-surface border-2 border-border rounded-2xl p-2.5 space-y-1.5">
              {group.items.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-primary/50" />
                  <span className="text-xs text-text">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

/* ───────────────────────────────────────────
   Try-it-yourself demo recipes
   ─────────────────────────────────────────── */
type DemoRecipe = {
  id: number;
  name: string;
  emoji: string;
  cal: number;
  protein: number;
  category: string;
  color: string;
};

const DEMO_RECIPES: DemoRecipe[] = [
  { id: 1, name: "Garlic Butter Pasta",    emoji: "🍝", cal: 420, protein: 12, category: "pasta",   color: "#FFE082" },
  { id: 2, name: "Chicken Caesar Salad",   emoji: "🥗", cal: 380, protein: 32, category: "salad",   color: "#66BB6A" },
  { id: 3, name: "Beef Tacos",             emoji: "🌮", cal: 510, protein: 28, category: "beef",    color: "#EF9A9A" },
  { id: 4, name: "Salmon & Rice Bowl",     emoji: "🐟", cal: 480, protein: 35, category: "fish",    color: "#80DEEA" },
  { id: 5, name: "Veggie Stir Fry",        emoji: "🥦", cal: 290, protein: 14, category: "vegetarian", color: "#C5E1A5" },
  { id: 6, name: "BBQ Chicken Wrap",       emoji: "🌯", cal: 450, protein: 30, category: "chicken", color: "#FFCC80" },
];

const DEMO_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/* ───────────────────────────────────────────
   Feature data
   ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "📊",
    title: "Nutrition Tracking",
    desc: "Calories, protein, carbs, and fat — all calculated automatically from your recipes.",
    color: "bg-primary/15",
  },
  {
    icon: "📅",
    title: "Calendar Meal Planner",
    desc: "Drag recipes into your week. See your whole plan at a glance.",
    color: "bg-secondary/20",
  },
  {
    icon: "☑️",
    title: "Grocery Lists",
    desc: "One click generates a smart, consolidated grocery list from your meal plan.",
    color: "bg-accent/15",
  },
  {
    icon: "⚡",
    title: "Quick Log",
    desc: "Ate something off-plan? Log it in seconds without creating a full recipe.",
    color: "bg-primary/15",
  },
  {
    icon: "🌎",
    title: "Explore Recipes",
    desc: "Browse recipes shared by the community. Save the ones you love.",
    color: "bg-secondary/20",
  },
  {
    icon: "📱",
    title: "Mobile Friendly",
    desc: "Plan meals and check your grocery list right from your phone.",
    color: "bg-accent/15",
  },
];

/* ───────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────── */
export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Drag-and-drop planner state — keyed by "day-slot", multiple recipes per slot
  const SLOTS = ["Breakfast", "Lunch", "Dinner"] as const;
  type SlotKey = `${string}-${(typeof SLOTS)[number]}`;

  const [calendar, setCalendar] = useState<Record<SlotKey, DemoRecipe[]>>(() => {
    const init: Record<string, DemoRecipe[]> = {};
    DEMO_DAYS.forEach((d) => SLOTS.forEach((s) => (init[`${d}-${s}`] = [])));
    return init;
  });
  const [dragging, setDragging] = useState<DemoRecipe | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);
  const [touchDragRecipe, setTouchDragRecipe] = useState<DemoRecipe | null>(null);

  const handleDragStart = useCallback((recipe: DemoRecipe) => {
    setDragging(recipe);
  }, []);

  const handleDrop = useCallback(
    (slotKey: SlotKey) => {
      if (!dragging) return;
      setCalendar((prev) => {
        const existing = prev[slotKey];
        if (existing.some((r) => r.id === dragging.id)) return prev;
        return { ...prev, [slotKey]: [...existing, dragging] };
      });
      setDragging(null);
      setDragOverSlot(null);
    },
    [dragging]
  );

  const handleRemoveFromSlot = useCallback((slotKey: SlotKey, recipeId: number) => {
    setCalendar((prev) => ({
      ...prev,
      [slotKey]: prev[slotKey].filter((r) => r.id !== recipeId),
    }));
  }, []);

  // Touch drag handlers for mobile
  const handleTouchStart = useCallback((recipe: DemoRecipe) => {
    setTouchDragRecipe(recipe);
    setDragging(recipe);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchDragRecipe) return;
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotEl = el?.closest("[data-slot]");
      setDragOverSlot(slotEl ? (slotEl.getAttribute("data-slot") as SlotKey) : null);
    },
    [touchDragRecipe]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchDragRecipe && dragOverSlot) {
      setCalendar((prev) => {
        const existing = prev[dragOverSlot];
        if (existing.some((r) => r.id === touchDragRecipe.id)) return prev;
        return { ...prev, [dragOverSlot]: [...existing, touchDragRecipe] };
      });
    }
    setTouchDragRecipe(null);
    setDragging(null);
    setDragOverSlot(null);
  }, [touchDragRecipe, dragOverSlot]);

  const getDayRecipes = useCallback(
    (day: string) =>
      SLOTS.flatMap((s) => calendar[`${day}-${s}` as SlotKey]),
    [calendar]
  );

  const totalPlanned = Object.values(calendar).flat().length;

  const hero = useReveal(0.1);
  const demo = useReveal(0.1);
  const features = useReveal(0.1);
  const tryit = useReveal(0.1);
  const cta = useReveal(0.15);

  // Auto-cycle demo steps
  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => {
      setActiveStep((s) => (s + 1) % 3);
    }, 3500);
    return () => clearInterval(t);
  }, [isPaused]);

  const handleStepClick = useCallback((i: number) => {
    setActiveStep(i);
    setIsPaused(true);
    // Resume auto-cycle after 8 seconds of inactivity
    const t = setTimeout(() => setIsPaused(false), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden scroll-smooth">
      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b-2 border-border/50">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="text-lg font-extrabold text-text">Let Em Cook</span>
          <div className="flex items-center gap-2.5">
            <SignInButton mode="modal">
              <button className="px-5 py-2 bg-surface hover:bg-muted border-2 border-border text-text rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                Log In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-5 py-2 bg-accent hover:bg-accent/85 border-2 border-accent/80 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .reveal       { opacity: 0; transform: translateY(28px); }
        .reveal.show  { animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .stagger-1    { animation-delay: 0.1s; }
        .stagger-2    { animation-delay: 0.2s; }
        .stagger-3    { animation-delay: 0.3s; }
        .stagger-4    { animation-delay: 0.4s; }
        .stagger-5    { animation-delay: 0.5s; }
        .float-slow   { animation: float 5s ease-in-out infinite; }
        .float-med    { animation: float 4s ease-in-out infinite 0.5s; }
        .float-fast   { animation: float 3s ease-in-out infinite 1s; }
      `}</style>

      {/* ════════════════════════════════════
          HERO
         ════════════════════════════════════ */}
      <section className="relative min-h-[70vh] flex items-center justify-center px-5 py-16">
        {/* Background decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl float-slow" />
          <div className="absolute top-1/3 -left-16 w-56 h-56 bg-secondary/15 rounded-full blur-3xl float-med" />
          <div className="absolute bottom-20 right-1/4 w-44 h-44 bg-accent/10 rounded-full blur-3xl float-fast" />
        </div>

        <div
          ref={hero.ref}
          className={`relative z-10 text-center max-w-3xl mx-auto reveal ${hero.visible ? "show" : ""}`}
        >
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 bg-surface border-2 border-border rounded-full px-4 py-1.5 mb-8 shadow-sm reveal ${hero.visible ? "show stagger-1" : ""}`}
          >
            <span className="text-sm">🔥</span>
            <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">
              Meal planning, simplified
            </span>
          </div>

          <h1
            className={`text-4xl sm:text-6xl md:text-7xl font-extrabold text-text leading-[1.1] mb-5 tracking-tight reveal ${hero.visible ? "show stagger-2" : ""}`}
          >
            Stop guessing.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">Let Em Cook.</span>
              <span className="absolute bottom-1 left-0 w-full h-3 sm:h-4 bg-primary/25 -z-0 rounded-sm" />
            </span>
          </h1>

          <p
            className={`text-lg sm:text-xl text-text-secondary max-w-lg mx-auto mb-10 leading-relaxed reveal ${hero.visible ? "show stagger-3" : ""}`}
          >
            Plan meals. Save time. Eat well.
            <br className="hidden sm:block" />
            Your recipes, your week, one grocery list — all in one place.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-3 justify-center reveal ${hero.visible ? "show stagger-4" : ""}`}
          >
            <SignUpButton mode="modal">
              <button className="bg-accent hover:bg-accent/85 border-2 border-accent/80 text-white rounded-2xl px-8 py-3.5 text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-200">
                Get Started — Free
              </button>
            </SignUpButton>
          </div>

          {/* Scroll prompt to demo */}
          <a
            href="#demo"
            className={`inline-flex flex-col items-center gap-2 mt-12 group reveal ${hero.visible ? "show stagger-5" : ""}`}
          >
            <span className="px-8 py-3.5 bg-surface hover:bg-muted border-2 border-border text-text rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-200">
              See It In Action — Try The Demo
            </span>
            <span className="text-2xl mt-1" style={{ animation: "float 1.5s ease-in-out infinite" }}>
              ↓
            </span>
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════
          TRY IT — DRAG & DROP PLANNER
         ════════════════════════════════════ */}
      <section id="demo" className="px-5 py-16 sm:py-24">
        <div
          ref={tryit.ref}
          className={`max-w-5xl mx-auto reveal ${tryit.visible ? "show" : ""}`}
        >
          <div className="text-center mb-10">
            <h2
              className={`text-3xl sm:text-4xl font-extrabold text-text mb-3 reveal ${tryit.visible ? "show stagger-1" : ""}`}
            >
              Try it yourself
            </h2>
            <p
              className={`text-text-secondary text-base sm:text-lg reveal ${tryit.visible ? "show stagger-2" : ""}`}
            >
              Drag recipes into the calendar to plan your week. Go ahead — it
              actually works.
            </p>
          </div>

          <div
            className={`flex flex-col gap-6 reveal ${tryit.visible ? "show stagger-3" : ""}`}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Recipe cards — horizontal row on top */}
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3 ml-1">
                Your Recipes — drag into the calendar below
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {DEMO_RECIPES.map((recipe) => (
                  <div
                    key={recipe.id}
                    draggable
                    onDragStart={() => handleDragStart(recipe)}
                    onDragEnd={() => {
                      setDragging(null);
                      setDragOverSlot(null);
                    }}
                    onTouchStart={() => handleTouchStart(recipe)}
                    className={`group bg-surface border-2 border-border rounded-2xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.03] transition-all duration-200 select-none ${
                      dragging?.id === recipe.id ? "opacity-50 scale-95" : ""
                    }`}
                    style={{
                      boxShadow: `inset 0 0 12px ${recipe.color}40`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{recipe.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text text-sm truncate">
                          {recipe.name}
                        </p>
                        <p className="text-text-secondary text-xs">
                          {recipe.cal} cal · {recipe.protein}g P
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar drop zones — full width below */}
            <div>
              <div className="flex items-center justify-between mb-3 ml-1">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                  This Week
                </p>
                {totalPlanned > 0 && (
                  <button
                    onClick={() => {
                      const init: Record<string, DemoRecipe[]> = {};
                      DEMO_DAYS.forEach((d) => SLOTS.forEach((s) => (init[`${d}-${s}`] = [])));
                      setCalendar(init);
                    }}
                    className="text-xs text-text-secondary hover:text-accent transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Slot label column + day columns */}
              <div className="grid gap-2 sm:gap-2.5" style={{ gridTemplateColumns: "auto repeat(5, 1fr)" }}>
                {/* Header row: empty corner + day names */}
                <div />
                {DEMO_DAYS.map((day) => (
                  <p key={day} className="text-xs sm:text-sm font-bold text-text-secondary text-center py-1">
                    {day}
                  </p>
                ))}

                {/* Slot rows: Breakfast, Lunch, Dinner */}
                {SLOTS.map((slot) => (
                  <React.Fragment key={slot}>
                    <div className="flex items-center">
                      <p className="text-[10px] sm:text-xs font-semibold text-text-secondary/60 whitespace-nowrap">
                        {slot}
                      </p>
                    </div>
                    {DEMO_DAYS.map((day) => {
                      const slotKey = `${day}-${slot}` as SlotKey;
                      const recipes = calendar[slotKey];
                      const isOver = dragOverSlot === slotKey;
                      return (
                        <div
                          key={slotKey}
                          data-slot={slotKey}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverSlot(slotKey);
                          }}
                          onDragLeave={() => setDragOverSlot(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(slotKey);
                          }}
                          className={`min-h-[72px] sm:min-h-[88px] rounded-2xl border-2 p-2 sm:p-2.5 transition-all duration-200 flex flex-col gap-1.5 ${
                            isOver
                              ? "border-primary bg-primary/10 scale-[1.03]"
                              : "border-border bg-surface"
                          }`}
                        >
                          {recipes.map((recipe) => (
                            <div
                              key={recipe.id}
                              className="group/chip bg-surface border border-border rounded-xl px-2 py-1.5 flex items-center gap-1.5"
                              style={{ boxShadow: `inset 0 0 10px ${recipe.color}50` }}
                            >
                              <span className="text-sm sm:text-base">{recipe.emoji}</span>
                              <span className="text-[10px] sm:text-xs font-medium text-text truncate flex-1">
                                {recipe.name.split(" ").slice(0, 2).join(" ")}
                              </span>
                              <button
                                onClick={() => handleRemoveFromSlot(slotKey, recipe.id)}
                                className="text-text-secondary hover:text-accent text-xs opacity-0 group-hover/chip:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {recipes.length === 0 && !dragging && (
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-[10px] text-text-secondary/30">—</span>
                            </div>
                          )}
                          {dragging && (
                            <div className="border-2 border-dashed border-primary/30 rounded-xl h-8 flex items-center justify-center">
                              <span className="text-xs text-primary/50">+</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* Macro totals row */}
                <div className="flex items-center">
                  <p className="text-[10px] sm:text-xs font-semibold text-text-secondary/60">
                    Total
                  </p>
                </div>
                {DEMO_DAYS.map((day) => {
                  const recipes = getDayRecipes(day);
                  const totalCal = recipes.reduce((s, r) => s + r.cal, 0);
                  const totalP = recipes.reduce((s, r) => s + r.protein, 0);
                  return (
                    <div key={`${day}-totals`} className="text-center py-1.5 border-t-2 border-border/50">
                      {recipes.length > 0 ? (
                        <>
                          <p className="text-xs sm:text-sm font-bold text-text">
                            {totalCal}
                            <span className="font-normal text-text-secondary"> cal</span>
                          </p>
                          <p className="text-[10px] sm:text-xs text-text-secondary">
                            {totalP}g P
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-text-secondary/30">—</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feedback message */}
              <div className="mt-4 text-center min-h-[2rem]">
                {totalPlanned === 0 && (
                  <p className="text-sm text-text-secondary">
                    👆 Drag a recipe into any day to get started
                  </p>
                )}
                {totalPlanned > 0 && totalPlanned < 5 && (
                  <p className="text-sm text-text-secondary">
                    Nice! {totalPlanned} meal{totalPlanned > 1 ? "s" : ""}{" "}
                    planned — keep going!
                  </p>
                )}
                {totalPlanned >= 5 && (
                  <p className="text-sm text-text">
                    🔥 {totalPlanned} meals planned! Imagine generating a
                    grocery list from this in one click.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          INTERACTIVE DEMO
         ════════════════════════════════════ */}
      <section className="px-5 py-16 sm:py-24">
        <div
          ref={demo.ref}
          className={`max-w-4xl mx-auto reveal ${demo.visible ? "show" : ""}`}
        >
          <div className="text-center mb-10">
            <h2
              className={`text-3xl sm:text-4xl font-extrabold text-text mb-3 reveal ${demo.visible ? "show stagger-1" : ""}`}
            >
              Three steps to a better week
            </h2>
            <p
              className={`text-text-secondary text-base sm:text-lg reveal ${demo.visible ? "show stagger-2" : ""}`}
            >
              Add recipes, plan your meals, and generate a grocery list — all in
              under a minute.
            </p>
          </div>

          {/* Step selector tabs */}
          <div
            className={`flex justify-center gap-2 sm:gap-3 mb-8 reveal ${demo.visible ? "show stagger-2" : ""}`}
          >
            {DEMO_STEPS.map((step, i) => (
              <button
                key={step.title}
                onClick={() => handleStepClick(i)}
                className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl border-2 font-semibold text-sm transition-all duration-300 ${
                  activeStep === i
                    ? `${step.accent} border-border text-text shadow-md scale-[1.04]`
                    : "bg-surface border-border text-text-secondary hover:bg-muted"
                }`}
              >
                <span className="font-bold">{i + 1}</span>
                <span className="hidden sm:inline">{step.title}</span>
                {/* Auto-cycle progress bar */}
                {activeStep === i && !isPaused && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-text/15 rounded-full overflow-hidden">
                    <span
                      className="block h-full bg-text/40 rounded-full"
                      style={{
                        animation: "shimmer 3.5s linear",
                        backgroundSize: "200% 100%",
                        width: "100%",
                      }}
                    />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Demo preview card */}
          <div className="bg-surface border-2 border-border rounded-3xl shadow-lg overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b-2 border-border bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <div className="w-3 h-3 rounded-full bg-secondary/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              <span className="text-xs font-semibold text-text-secondary tracking-wide">
                {DEMO_STEPS[activeStep].title}
              </span>
              <span className="ml-auto text-xs text-text-secondary/50">
                let-em-cook.io
              </span>
            </div>

            {/* Content area */}
            <div className="p-5 sm:p-7 min-h-[320px] relative">
              {DEMO_STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="transition-all duration-500 ease-out"
                  style={{
                    opacity: activeStep === i ? 1 : 0,
                    transform: activeStep === i ? "translateY(0)" : "translateY(12px)",
                    position: activeStep === i ? "relative" : "absolute",
                    top: activeStep === i ? undefined : 0,
                    left: activeStep === i ? undefined : 0,
                    right: activeStep === i ? undefined : 0,
                    pointerEvents: activeStep === i ? "auto" : "none",
                  }}
                >
                  {step.content}
                </div>
              ))}
            </div>

            {/* Step indicator dots */}
            <div className="flex justify-center gap-2 pb-5">
              {DEMO_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleStepClick(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    activeStep === i
                      ? "bg-text w-6"
                      : "bg-border hover:bg-text-secondary"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FEATURES
         ════════════════════════════════════ */}
      <section className="px-5 py-16 sm:py-24">
        <div ref={features.ref} className="max-w-5xl mx-auto">
          <div
            className={`text-center mb-12 reveal ${features.visible ? "show" : ""}`}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-3">
              Everything you need to eat better
            </h2>
            <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
              No bloat. No complexity. Just the tools that actually help you
              plan, cook, and stay on track.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group bg-surface border-2 border-border rounded-3xl p-6 shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 transition-all duration-300 reveal ${
                  features.visible ? `show stagger-${(i % 5) + 1}` : ""
                }`}
              >
                <div
                  className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-text text-lg mb-1.5">
                  {f.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ════════════════════════════════════
          FINAL CTA
         ════════════════════════════════════ */}
      <section className="px-5 py-20 sm:py-28">
        <div
          ref={cta.ref}
          className={`max-w-2xl mx-auto text-center reveal ${cta.visible ? "show" : ""}`}
        >
          <h2
            className={`text-3xl sm:text-5xl font-extrabold text-text mb-4 reveal ${cta.visible ? "show stagger-1" : ""}`}
          >
            Ready to cook smarter?
          </h2>
          <p
            className={`text-text-secondary text-lg mb-10 reveal ${cta.visible ? "show stagger-2" : ""}`}
          >
            Join for free. No credit card. Start planning your first week in
            minutes.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-3 justify-center reveal ${cta.visible ? "show stagger-3" : ""}`}
          >
            <SignUpButton mode="modal">
              <button className="bg-accent hover:bg-accent/85 border-2 border-accent/80 text-white rounded-2xl px-10 py-4 text-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-200">
                Sign Up Free
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="bg-surface hover:bg-muted border-2 border-border text-text rounded-2xl px-10 py-4 text-xl font-bold shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                Log In
              </button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-border px-5 py-8 text-center">
        <p className="text-text-secondary text-sm">
          © {new Date().getFullYear()} Let Em Cook. Made with 🔥 for home cooks
          everywhere.
        </p>
      </footer>
    </div>
  );
}
