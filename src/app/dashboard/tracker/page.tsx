"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import DailyTracker from "@/components/DailyTracker";

function TrackerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.push("/signin");
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Loading…</p>
      </div>
    );
  }

  const dateParam = searchParams.get("date");
  const initialDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 pb-20 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between mt-4 sm:mt-10 px-2 sm:px-0">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-text-secondary hover:text-text"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <DailyTracker initialDate={initialDate} />
      </div>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-text-secondary">Loading…</p>
        </div>
      }
    >
      <TrackerPageContent />
    </Suspense>
  );
}
