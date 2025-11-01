"use client";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-bg">
      {/* Main Card with 3 Steps */}
      <div className="w-full max-w-3xl bg-surface border-2 border-black rounded 3xl p-6 mb-6 rounded-2xl drop-shadow-lg">
        {/* Step 1 */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl border-2 border-black flex items-center justify-center">
            <span className="text-4xl font-bold text-black">1</span>
          </div>
          <h2 className="text-4xl font-bold text-black">Add Recipes</h2>
        </div>
        {/* Step 2 */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-secondary rounded-2xl border-2 border-black flex items-center justify-center">
            <span className="text-4xl font-bold text-black">2</span>
          </div>
          <h2 className="text-4xl font-bold text-black">Create Meal Plan </h2>
        </div>

        {/*Step 3 */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-warning rounded-2xl border-2 border-black flex items-center justify-center">
            <span className="text-4xl font-bold text-black">3</span>
          </div>
          <h2 className="text-4xl font-bold text-black">
            Generate Grocery List!
          </h2>
        </div>
      </div>
      {/* Buttons */}
      <button className="w-full max-w-3xl bg-accent hover:bg-accent/90 border-2 border-black rounded-3xl py-6 mb-4 transition-colors drop-shadow-lg">
        <span className="text-3xl font-bold text-black">Sign Up</span>
      </button>
      <div className="flex gap-4 w-full max-w-3xl">
        <button className="flex-1 bg-primary hover:bg-primary/90 border-2 border-black rounded-3xl py-6 transition-colors drop-shadow-lg">
          <span className="text-2xl font-bold text-black">View Recipes</span>
        </button>
        <button className="flex-1 bg-primary hover:bg-primary/90 border-2 border-black rounded-3xl py-6 transition-colors drop-shadow-lg">
          <span className="text-2xl font-bold text-black">Login</span>
        </button>
      </div>
    </div>
  );
}
