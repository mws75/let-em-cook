"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-bg">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-5xl font-bold text-text mb-2">Let Em Cook</h1>
        <p className="text-lg text-text-secondary">
          Plan meals. Save time. Eat well.
        </p>
      </div>

      {/* Main Card with 3 Steps */}
      <div className="w-full max-w-2xl bg-surface border-2 border-border rounded-3xl p-8 mb-5 shadow-lg">
        {/* Step 1 */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 bg-primary rounded-xl border-2 border-border flex items-center justify-center shadow-md hover:scale-105 transition-transform">
            <span className="text-3xl">📖</span>
          </div>
          <h2 className="text-2xl font-bold text-text">Add Recipes</h2>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 bg-secondary rounded-xl border-2 border-border flex items-center justify-center shadow-md hover:scale-105 transition-transform">
            <span className="text-3xl">📅</span>
          </div>
          <h2 className="text-2xl font-bold text-text">Create Meal Plan</h2>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-accent rounded-xl border-2 border-border flex items-center justify-center shadow-md hover:scale-105 transition-transform">
            <span className="text-3xl">🛒</span>
          </div>
          <h2 className="text-2xl font-bold text-text">
            Generate Grocery List
          </h2>
        </div>
      </div>

      {/* Sign Up Button */}
      <SignUpButton mode="modal">
        <button className="w-full max-w-2xl bg-accent hover:bg-accent/80 border-2 border-border rounded-3xl py-4 mb-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
          <span className="text-2xl font-bold text-text">Sign Up</span>
        </button>
      </SignUpButton>

      {/* Bottom Buttons */}
      <div className="flex gap-3 w-full max-w-2xl">
        {/* <button className="flex-1 bg-primary hover:bg-primary/80 border-2 border-border rounded-3xl py-4 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"> */}
        {/*   <span className="text-xl font-bold text-text">View Recipes</span> */}
        {/* </button> */}
        {/**/}
        <SignInButton mode="modal">
          <button className="flex-1 bg-primary hover:bg-primary/80 border-2 border-border rounded-3xl py-4 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
            <span className="text-xl font-bold text-text">Login</span>
          </button>
        </SignInButton>
      </div>
    </div>
  );
}
