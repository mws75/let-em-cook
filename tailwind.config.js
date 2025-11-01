/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6DA34D", // 🌿 Leafy Green
        secondary: "#F6BD60", // 🍋 Citrus Yellow
        accent: "#D94E41", // 🍅 Ripe Tomato
        bg: "#FAF9F6", // 🫶 Off-White
        surface: "#FFFFFF", // 🧈 Cream White (Card Surface)
        text: "#2F2F2F", // 🪵 Deep Slate (Main Text)
        "text-secondary": "#6B6B6B", // 🌰 Soft Gray (Secondary Text)
        border: "#DCE2D8", // 🌿 Muted Green Gray (Dividers/Borders)

        success: "#4CAF50", // 🥦 Fresh Basil (Success/Positive)
        warning: "#F79D65", // 🍊 Tangelo (Warnings/Attention)
        error: "#C73E1D", // 🌶️ Chili Red (Errors/Danger)
        muted: "#EEF3EC", // 🫖 Mist Green (Muted Backgrounds)
        shadow: "#C8BBAE", // ☕ Warm Taupe (Shadows/Depth)
      },
    },
  },
  plugins: [],
};
