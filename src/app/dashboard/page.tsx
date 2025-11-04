"use client";

export default function Dashboard() {
  return (
    <div className="justify-center">
      {/* Header Information */}
      <div className="flex justify-center mt-10 mb-10">
        <h1 className="text-4xl text-text font-bold">🔪 Let's Get Cooking!</h1>
      </div>

      {/* Meal Prep Section */}
      <div className="flex justify-center">
        <div className="w-2/3 border-2 border-border rounded-3xl p-6 bg-surface shadow-lg">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 border-2 border-border rounded-3xl p-8 bg-surface">
              <h2 className="text-3xl text-text text-center">My Recipes </h2>
            </div>

            <button className="w-32 bg-secondar hover:bg-secondar/80 border-2 border-border rounded-3xl py-4 mb-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <span className="text-1xl font-bold text-text">
                Generate List
              </span>
            </button>
          </div>
          <button className="w-full bg-accent hover:bg-accent/80 border-2 border-border rounded-3xl py-4 shadow-md hover:shadow-lg transition-all">
            <span className="text-2xl font-bold text-text">Create Recipe</span>
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="flex justify-center mt-10">
        <div className="w-2/3 border-2 border-border rounded-3xl p-8 bg-surface shadow-lg">
          <h2 className="text-3xl text-text font-bold mb-6 text-center">
            📊 Your Kitchen Stats
          </h2>

          <div className="flex gap-6">
            {/* Left Side - Nutrition & Stats */}
            <div className="flex-1 space-y-4">
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-primary/20 border-2 border-border rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">📖</span>
                    <p className="text-sm text-text-secondary font-semibold">
                      Total Recipes
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-text ml-9">12</p>
                </div>

                <div className="bg-secondary/20 border-2 border-border rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">⭐</span>
                    <p className="text-sm text-text-secondary font-semibold">
                      Favorites
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-text ml-9">5</p>
                </div>
              </div>

              {/* Nutrition Information */}
              <div className="bg-muted border-2 border-border rounded-2xl p-5">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <span className="text-2xl">🥗</span>
                  Average Nutrition
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔥</span>
                      <span className="text-text font-semibold">Calories</span>
                    </div>
                    <span className="text-text font-bold">300 cal</span>
                  </div>

                  <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💪</span>
                      <span className="text-text font-semibold">Protein</span>
                    </div>
                    <span className="text-text font-bold">10g</span>
                  </div>

                  <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🥑</span>
                      <span className="text-text font-semibold">Fat</span>
                    </div>
                    <span className="text-text font-bold">50g</span>
                  </div>

                  <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🍬</span>
                      <span className="text-text font-semibold">Sugar</span>
                    </div>
                    <span className="text-text font-bold">10g</span>
                  </div>

                  <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌾</span>
                      <span className="text-text font-semibold">Carbs</span>
                    </div>
                    <span className="text-text font-bold">45g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Pie Chart */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 border-4 border-border rounded-full w-72 h-72 shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
                  <div className="text-center">
                    <p className="text-6xl mb-2">📈</p>
                    <p className="text-text-secondary font-semibold">
                      Chart Coming Soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Recipes */}
      <div className="flex flex-col justify-center mt-10 mx-auto w-2/3 border-2 border-border rounded-3xl bg-surface shadow-lg p-6 mb-20">
        {/* Search Bar */}
        <div className="flex p-2">
          <h2 className="text-3xl text-text text-center font-bold pr-10">
            Recipes{" "}
          </h2>
          <form className="flex gap-2 ml-auto w-max">
            <input
              type="text"
              placeholder="Search recipes..."
              className="w-96 px-4 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
            />
            <button className="px-6 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all">
              Search
            </button>
          </form>
        </div>
        {/* Category */}
        <div className="flex flex-col justify-center w-full mt-10 border-2 border-border rounded-2xl bg-surface">
          <h2 className="text-3xl text-text text-left font-bold ml-5 mt-5 mb-5">
            Snacks
          </h2>
          <div className="flex flex-row">
            <div className="w-50 h-50 border-2 border-border rounded-2xl bg-surface shadow-lg m-5">
              <p>Recipe this is the one</p>
            </div>
            <div className="w-50 h-50 border-2 border-border rounded-2xl bg-surface shadow-lg m-5">
              <p>Recipe this is the one</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
