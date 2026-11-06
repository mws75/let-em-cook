"use client";

import { useEffect } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

type SignUpPromptModalProps = {
  isOpen: boolean;
  // Backdrop click / Escape — just close the popup
  onClose: () => void;
  // "Keep Exploring!" button
  onKeepExploring: () => void;
  // Where Clerk sends the user after they sign up (or sign in from the modal)
  redirectUrl: string;
  // Also offer "Sign In" for returning users whose session expired
  showSignIn?: boolean;
};

// Copy written by the owner — keep it as-is.
const FEATURES = [
  "Explore and Save Recipes",
  "Create your Own",
  "Create weekly meal plan",
  "Generate grocery lists",
  "Track your macros",
];

export default function SignUpPromptModal({
  isOpen,
  onClose,
  onKeepExploring,
  redirectUrl,
  showSignIn = false,
}: SignUpPromptModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-prompt-title"
        className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />
        <div className="p-6">
          <h2
            id="signup-prompt-title"
            className="text-2xl font-bold text-text mb-3"
          >
            Ready to Get Cooking?
          </h2>
          <p className="text-text mb-2">Here is what your profile includes:</p>
          <ol className="list-decimal pl-6 space-y-1 text-text">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
          <p className="text-text mt-3 font-semibold">All in one place</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <SignUpButton
              mode="modal"
              forceRedirectUrl={redirectUrl}
              signInForceRedirectUrl={redirectUrl}
            >
              <button className="flex-1 px-6 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl font-bold text-white transition-all">
                Sign Up
              </button>
            </SignUpButton>
            {showSignIn && (
              <SignInButton
                mode="modal"
                forceRedirectUrl={redirectUrl}
                signUpForceRedirectUrl={redirectUrl}
              >
                <button className="flex-1 px-6 py-2 bg-surface hover:bg-muted border border-border rounded-xl font-bold text-text transition-all">
                  Sign In
                </button>
              </SignInButton>
            )}
            <button
              onClick={onKeepExploring}
              className="flex-1 px-6 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-all"
            >
              Keep Exploring!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
