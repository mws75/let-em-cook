"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "letEmCook_hasSeenGuide";

type Workflow = "mealprep" | "logasyougo";

const MEAL_PREP_STEPS = [
  {
    number: 1,
    title: "Add Recipes",
    desc: "Browse community recipes with Explore Recipes or create your own with Create Recipe. They'll appear in your recipe list below.",
    icon: "📖",
    color: "bg-secondary/30",
  },
  {
    number: 2,
    title: "Select Recipes",
    desc: "Check the box on any recipe card to select it. Selected recipes appear in the meal prep area at the top.",
    icon: "✅",
    color: "bg-primary/20",
  },
  {
    number: 3,
    title: "Open the Calendar",
    desc: "Click Create Calendar to open your weekly meal plan. Drag selected recipes into any day and meal slot.",
    icon: "📅",
    color: "bg-secondary/30",
  },
  {
    number: 4,
    title: "Generate Grocery List",
    desc: "With recipes selected, hit Generate Grocery List. We'll combine all ingredients into one organized list you can download.",
    icon: "☑️",
    color: "bg-accent/20",
  },
];

const LOG_AS_YOU_GO_STEPS = [
  {
    number: 1,
    title: "Save Your Go-To Foods",
    desc: "Use Create Recipe to save anything you eat regularly — a granola bar, your coffee order, a frozen meal, a sandwich from the deli. It doesn't have to be a recipe you cook. Think of it as saving a food with its nutrition info so you never have to type it again.",
    icon: "📖",
    color: "bg-secondary/30",
  },
  {
    number: 2,
    title: "Open the Calendar",
    desc: "Click Create Calendar to open your weekly view.",
    icon: "📅",
    color: "bg-primary/20",
  },
  {
    number: 3,
    title: "Quick Log What You Ate",
    desc: "Click + Quick Log on any meal slot. Choose From Recipe to log a saved food with one tap, or use Manual Entry to type something new.",
    icon: "⚡",
    color: "bg-secondary/30",
  },
  {
    number: 4,
    title: "Track Your Week",
    desc: "Your logged meals show up on the calendar with nutrition totals for each day. See how your week is shaping up at a glance.",
    icon: "📊",
    color: "bg-primary/20",
  },
];

export default function GettingStartedSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [workflow, setWorkflow] = useState<Workflow>("mealprep");

  const steps = workflow === "mealprep" ? MEAL_PREP_STEPS : LOG_AS_YOU_GO_STEPS;

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl border border-border  transition-all duration-200  ${
          isOpen ? "bg-accent/20 text-text" : "bg-surface text-text-secondary hover:bg-muted"
        }`}
        aria-label={isOpen ? "Close guide" : "Getting started guide"}
      >
        <span className="text-lg">{isOpen ? "✕" : "?"}</span>
      </button>

      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-full z-40 w-[320px] sm:w-[360px] bg-surface border-l border-border  transition-transform duration-300 ease-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 pt-16">
          {/* Header */}
          <h2 className="text-xl font-extrabold text-text mb-1">
            Getting Started
          </h2>
          <p className="text-sm text-text-secondary mb-5">
            Choose how you want to use Let Em Cook
          </p>

          {/* Workflow toggle */}
          <div className="flex gap-1.5 p-1 bg-muted border border-border rounded-2xl mb-6">
            <button
              onClick={() => setWorkflow("mealprep")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                workflow === "mealprep"
                  ? "bg-surface text-text  border border-border"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              I Meal Prep
            </button>
            <button
              onClick={() => setWorkflow("logasyougo")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                workflow === "logasyougo"
                  ? "bg-surface text-text  border border-border"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              I Log As I Go
            </button>
          </div>

          {/* Workflow description */}
          <div className="bg-muted border border-border rounded-2xl p-3.5 mb-6">
            <p className="text-xs text-text-secondary leading-relaxed">
              {workflow === "mealprep"
                ? "Plan your meals ahead of time. Add recipes, build a weekly calendar, and generate a grocery list before you shop."
                : "No planning needed. Eat first, then log what you had. Save the foods you eat often so logging takes one tap next time."}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={`${workflow}-${step.number}`}
                className="flex gap-3.5 items-start"
              >
                {/* Step number + connector line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-xl ${step.color} border border-border flex items-center justify-center text-lg shrink-0`}
                  >
                    {step.icon}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-0.5 h-5 bg-border mt-1.5" />
                  )}
                </div>

                {/* Content */}
                <div className="pt-0.5 pb-2">
                  <p className="font-bold text-text text-sm mb-0.5">
                    <span className="text-text-secondary mr-1.5">
                      {step.number}.
                    </span>
                    {step.title}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro tip */}
          <div className="mt-6 bg-primary/10 border border-primary/20 rounded-2xl p-3.5">
            <p className="text-xs font-bold text-text mb-1">Pro tip</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {workflow === "mealprep"
                ? "You can do both! Use the calendar for planned meals and Quick Log for anything you eat off-plan."
                : "\"Recipes\" aren't just for cooking! Save things like \"Nature Valley Granola Bar\" or \"Chipotle Burrito Bowl\" so you can log them instantly next time."}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-5 py-3 bg-primary hover:bg-primary/80 border border-border rounded-2xl text-sm font-bold text-text transition-all"
          >
            Got it, let me cook!
          </button>
        </div>
      </div>
    </>
  );
}
