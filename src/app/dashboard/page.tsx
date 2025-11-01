"use client";

export default function Dashboard() {
  return (
    <div className="justify-center">
      {/* Header Information */}
      <div className="flex justify-center mt-10 mb-10">
        <h1 className="text-4xl text-text font-bold">Let's Get Cooking!</h1>
      </div>

      {/* Recipes */}
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
      <div className="flex items-center justify-center">
        <div className="flex items-center justify-center mt-10 border-2 border-border rounded-2xl py-2 mb-3 shadow-lg w-2/3">
          <h2 className="text-3xl text-text">Dashboard</h2>
        </div>
      </div>
    </div>
  );
}
