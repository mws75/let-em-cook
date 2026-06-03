export type Category =
  | "Foundations"
  | "Buttons"
  | "Forms"
  | "Cards"
  | "Feedback"
  | "Navigation"
  | "Layout"
  | "Overlays";

export const CATEGORIES: Category[] = [
  "Foundations",
  "Buttons",
  "Forms",
  "Cards",
  "Feedback",
  "Navigation",
  "Layout",
  "Overlays",
];

export interface StyleElement {
  id: string;
  name: string;
  category: Category;
  description: string;
  html: string;
  css: string;
  previewHeight?: number;
  previewBodyStyle?: string;
}

export interface ColorToken {
  name: string;
  cssVar: string;
  hex: string;
  group: "brand" | "semantic" | "neutral";
}

export interface CategoryColorToken {
  name: string;
  hex: string;
}

export const BRAND_COLORS: ColorToken[] = [
  { name: "Primary",        cssVar: "--color-primary",        hex: "#a8d5ba", group: "brand" },
  { name: "Secondary",      cssVar: "--color-secondary",      hex: "#ffe5b4", group: "brand" },
  { name: "Accent",         cssVar: "--color-accent",         hex: "#ffb5b5", group: "brand" },
  { name: "Background",     cssVar: "--color-background",     hex: "#fdfbf7", group: "neutral" },
  { name: "Surface",        cssVar: "--color-surface",        hex: "#ffffff",  group: "neutral" },
  { name: "Muted",          cssVar: "--color-muted",          hex: "#f7fafc", group: "neutral" },
  { name: "Text",           cssVar: "--color-text",           hex: "#4a5568", group: "neutral" },
  { name: "Text Secondary", cssVar: "--color-text-secondary", hex: "#718096", group: "neutral" },
  { name: "Border",         cssVar: "--color-border",         hex: "#e2e8f0", group: "neutral" },
  { name: "Shadow",         cssVar: "--color-shadow",         hex: "#cbd5e0", group: "neutral" },
  { name: "Foreground",     cssVar: "--color-foreground",     hex: "#4a5568", group: "neutral" },
  { name: "Success",        cssVar: "--color-success",        hex: "#81c784", group: "semantic" },
  { name: "Warning",        cssVar: "--color-warning",        hex: "#ffd54f", group: "semantic" },
  { name: "Error",          cssVar: "--color-error",          hex: "#e57373", group: "semantic" },
];

export const CATEGORY_COLORS: CategoryColorToken[] = [
  { name: "Breakfast",   hex: "#FFE5B4" },
  { name: "Lunch",       hex: "#D5EAF7" },
  { name: "Dinner",      hex: "#E2D1EA" },
  { name: "Snack",       hex: "#D5E8D6" },
  { name: "Dessert",     hex: "#F4D4DF" },
  { name: "Chicken",     hex: "#FFE7C2" },
  { name: "Beef",        hex: "#F2D2D2" },
  { name: "Pork",        hex: "#FADAD0" },
  { name: "Fish",        hex: "#D2E8EB" },
  { name: "Seafood",     hex: "#D3E2DD" },
  { name: "Soup",        hex: "#FFF3C4" },
  { name: "Pasta",       hex: "#FFEBC2" },
  { name: "Salad",       hex: "#DDEBD3" },
  { name: "Vegetarian",  hex: "#E2EAD0" },
  { name: "Vegan",       hex: "#D2EDD9" },
  { name: "Gluten Free", hex: "#DCE2E6" },
  { name: "Dairy Free",  hex: "#DCEEF7" },
  { name: "Keto",        hex: "#F2DCDD" },
  { name: "Low Carb",    hex: "#E8E1DF" },
  { name: "Meal Prep",   hex: "#D2DEEE" },
];

export const ROOT_CSS = `
*,*::before,*::after{box-sizing:border-box;}
:root{
  --color-background: #fdfbf7;
  --color-foreground: #4a5568;
  --color-primary: #a8d5ba;
  --color-secondary: #ffe5b4;
  --color-accent: #ffb5b5;
  --color-surface: #ffffff;
  --color-text: #4a5568;
  --color-text-secondary: #718096;
  --color-border: #e2e8f0;
  --color-muted: #f7fafc;
  --color-success: #81c784;
  --color-warning: #ffd54f;
  --color-error: #e57373;
  --color-shadow: #cbd5e0;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-full: 9999px;
}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--color-background);color:var(--color-text);font-size:16px;line-height:1.5;}
`;

export const SHARED_CSS = `
.btn{display:inline-flex;align-items:center;justify-content:center;padding:.45rem 1.25rem;border:1px solid var(--color-border);border-radius:var(--radius-xl);font-size:.875rem;font-weight:700;cursor:pointer;transition:filter .15s ease,opacity .15s ease;font-family:inherit;line-height:1.25;}
.btn:hover{filter:brightness(.95);}
.btn:disabled{opacity:.5;cursor:not-allowed;filter:none;}
.btn-primary{background:var(--color-primary);color:var(--color-text);}
.btn-secondary{background:var(--color-secondary);color:var(--color-text);}
.btn-accent{background:var(--color-accent);color:var(--color-text);}
.btn-muted{background:var(--color-muted);color:var(--color-text);}
.btn-sm{padding:.3rem .85rem;font-size:.8125rem;}
.btn-lg{padding:.65rem 1.75rem;font-size:1rem;}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:1rem;}
.section{border:1px solid var(--color-border);border-radius:1.5rem;background:var(--color-surface);padding:1.5rem;}
.input,.textarea,.select{width:100%;padding:.45rem .75rem;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font-size:.875rem;font-family:inherit;transition:border-color .15s ease;box-sizing:border-box;}
.input:focus,.textarea:focus,.select:focus{outline:none;border-color:var(--color-accent);}
.input::placeholder,.textarea::placeholder{color:var(--color-text-secondary);opacity:.6;}
.textarea{resize:vertical;min-height:90px;}
.badge{display:inline-block;padding:.15rem .6rem;border-radius:var(--radius-full);background:var(--color-muted);color:var(--color-text-secondary);font-size:.8125rem;}
.chip{display:inline-flex;align-items:center;padding:.25rem .85rem;border:1px solid var(--color-border);border-radius:var(--radius-full);background:var(--color-surface);color:var(--color-text-secondary);font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s ease,color .15s;}
.chip:hover{background:var(--color-muted);}
.chip-active{background:var(--color-primary);color:var(--color-text);border-color:var(--color-primary);}
.category-label{display:inline-block;font-size:.6875rem;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-secondary);}
.gradient-bar{height:.5rem;background:linear-gradient(to right,rgba(168,213,186,.2),rgba(255,229,180,.2),rgba(168,213,186,.2));}
.macro-tag{font-size:.75rem;color:var(--color-text-secondary);}
.label{display:block;font-size:.75rem;font-weight:600;color:var(--color-text-secondary);margin-bottom:.25rem;}
.checkbox-row{display:flex;align-items:center;gap:.625rem;padding:.4rem .5rem;border-radius:var(--radius-md);cursor:pointer;transition:background .15s;}
.checkbox-row:hover{background:var(--color-muted);}
.swatch{width:3rem;height:3rem;border-radius:var(--radius-md);border:1px solid rgba(0,0,0,.08);display:inline-block;}
`;

export const ELEMENTS: StyleElement[] = [
  // ─── FOUNDATIONS ───────────────────────────────────────────────────────────

  {
    id: "color-palette",
    name: "Brand Color Palette",
    category: "Foundations",
    description: "Core palette: sage green (primary), peach (secondary), coral (accent), neutral surface colors, and all 20 per-category tints.",
    previewHeight: 430,
    previewBodyStyle: "padding:1.5rem;background:var(--color-background);align-items:flex-start;",
    html: `<div style="display:flex;flex-direction:column;gap:1.25rem;">
  <div style="display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-primary);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Primary<br>#a8d5ba</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-secondary);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Secondary<br>#ffe5b4</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-accent);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Accent<br>#ffb5b5</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-background);border:1px solid var(--color-border);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Background<br>#fdfbf7</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-surface);border:1px solid var(--color-border);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Surface<br>#ffffff</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-muted);border:1px solid var(--color-border);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Muted<br>#f7fafc</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-text);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Text<br>#4a5568</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-border);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Border<br>#e2e8f0</span>
    </div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:.75rem;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-success);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Success</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-warning);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Warning</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.35rem;">
      <span class="swatch" style="background:var(--color-error);"></span>
      <span style="font-size:.7rem;color:var(--color-text-secondary);font-weight:600;">Error</span>
    </div>
  </div>
  <div style="border-top:1px solid var(--color-border);padding-top:1rem;">
    <p style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-secondary);margin:0 0 .75rem;">Category Colors</p>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;">
      <span class="cat-chip" style="background:#FFE5B4;">Breakfast</span>
      <span class="cat-chip" style="background:#D5EAF7;">Lunch</span>
      <span class="cat-chip" style="background:#E2D1EA;">Dinner</span>
      <span class="cat-chip" style="background:#D5E8D6;">Snack</span>
      <span class="cat-chip" style="background:#F4D4DF;">Dessert</span>
      <span class="cat-chip" style="background:#FFE7C2;">Chicken</span>
      <span class="cat-chip" style="background:#F2D2D2;">Beef</span>
      <span class="cat-chip" style="background:#FADAD0;">Pork</span>
      <span class="cat-chip" style="background:#D2E8EB;">Fish</span>
      <span class="cat-chip" style="background:#D3E2DD;">Seafood</span>
      <span class="cat-chip" style="background:#FFF3C4;">Soup</span>
      <span class="cat-chip" style="background:#FFEBC2;">Pasta</span>
      <span class="cat-chip" style="background:#DDEBD3;">Salad</span>
      <span class="cat-chip" style="background:#E2EAD0;">Vegetarian</span>
      <span class="cat-chip" style="background:#D2EDD9;">Vegan</span>
      <span class="cat-chip" style="background:#DCE2E6;">Gluten Free</span>
      <span class="cat-chip" style="background:#DCEEF7;">Dairy Free</span>
      <span class="cat-chip" style="background:#F2DCDD;">Keto</span>
      <span class="cat-chip" style="background:#E8E1DF;">Low Carb</span>
      <span class="cat-chip" style="background:#D2DEEE;">Meal Prep</span>
    </div>
  </div>
</div>`,
    css: `.swatch {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(0,0,0,.08);
  display: inline-block;
}
.cat-chip {
  display: inline-block;
  padding: .3rem .75rem;
  border-radius: var(--radius-full);
  border: 1px solid rgba(0,0,0,.08);
  font-size: .75rem;
  font-weight: 600;
  color: var(--color-text);
}`,
  },

  {
    id: "category-colors",
    name: "Category Color Palette",
    category: "Foundations",
    description: "Pastel per-category tints used as recipe card backgrounds. Each sits at ~88–92% lightness so dark text stays legible.",
    previewHeight: 220,
    previewBodyStyle: "padding:1.25rem;background:var(--color-background);align-items:flex-start;",
    html: `<div style="display:flex;flex-wrap:wrap;gap:.5rem;">
  <span class="cat-chip" style="background:#FFE5B4;">Breakfast</span>
  <span class="cat-chip" style="background:#D5EAF7;">Lunch</span>
  <span class="cat-chip" style="background:#E2D1EA;">Dinner</span>
  <span class="cat-chip" style="background:#D5E8D6;">Snack</span>
  <span class="cat-chip" style="background:#F4D4DF;">Dessert</span>
  <span class="cat-chip" style="background:#FFE7C2;">Chicken</span>
  <span class="cat-chip" style="background:#F2D2D2;">Beef</span>
  <span class="cat-chip" style="background:#FADAD0;">Pork</span>
  <span class="cat-chip" style="background:#D2E8EB;">Fish</span>
  <span class="cat-chip" style="background:#D3E2DD;">Seafood</span>
  <span class="cat-chip" style="background:#FFF3C4;">Soup</span>
  <span class="cat-chip" style="background:#FFEBC2;">Pasta</span>
  <span class="cat-chip" style="background:#DDEBD3;">Salad</span>
  <span class="cat-chip" style="background:#E2EAD0;">Vegetarian</span>
  <span class="cat-chip" style="background:#D2EDD9;">Vegan</span>
  <span class="cat-chip" style="background:#DCE2E6;">Gluten Free</span>
  <span class="cat-chip" style="background:#DCEEF7;">Dairy Free</span>
  <span class="cat-chip" style="background:#F2DCDD;">Keto</span>
  <span class="cat-chip" style="background:#E8E1DF;">Low Carb</span>
  <span class="cat-chip" style="background:#D2DEEE;">Meal Prep</span>
</div>`,
    css: `.cat-chip {
  display: inline-block;
  padding: .35rem .8rem;
  border-radius: var(--radius-full);
  border: 1px solid rgba(0,0,0,.08);
  font-size: .8rem;
  font-weight: 600;
  color: var(--color-text);
}`,
  },

  {
    id: "typography",
    name: "Typography Scale",
    category: "Foundations",
    description: "Heading and body text sizes. Font is Arial/Helvetica. Body text at #4a5568 with secondary text at #718096.",
    previewHeight: 240,
    previewBodyStyle: "padding:1.5rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="display:flex;flex-direction:column;gap:.5rem;">
  <p class="type-4xl">🔪 Let's Get Cooking!</p>
  <p class="type-3xl">Recipes</p>
  <p class="type-2xl">🛒 Your Grocery List</p>
  <p class="type-xl">Daily Macro Tracker</p>
  <p class="type-base">Body text — 16px, #4a5568</p>
  <p class="type-sm">Secondary text — 14px, #718096</p>
  <p class="type-xs">CATEGORY LABEL — 11px uppercase tracked</p>
</div>`,
    css: `.type-4xl { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
.type-3xl { font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0; }
.type-2xl { font-size: 1.25rem; font-weight: 700; color: var(--color-text); margin: 0; }
.type-xl  { font-size: 1rem;   font-weight: 700; color: var(--color-text); margin: 0; }
.type-base{ font-size: 1rem;   font-weight: 400; color: var(--color-text); margin: 0; }
.type-sm  { font-size: .875rem;font-weight: 400; color: var(--color-text-secondary); margin: 0; }
.type-xs  { font-size: .6875rem;font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-secondary); margin: 0; }`,
  },

  // ─── BUTTONS ───────────────────────────────────────────────────────────────

  {
    id: "button-variants",
    name: "Button Variants",
    category: "Buttons",
    description: "Four button variants: primary (sage), secondary (peach), accent (coral), muted (off-white). All share the same pill shape and font.",
    previewHeight: 100,
    html: `<div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
  <button class="btn btn-primary">Create Recipe</button>
  <button class="btn btn-secondary">Explore Recipes</button>
  <button class="btn btn-accent">Clear</button>
  <button class="btn btn-muted">Sign Out</button>
</div>`,
    css: `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .45rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  font-size: .875rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter .15s ease;
  font-family: inherit;
  line-height: 1.25;
}
.btn:hover { filter: brightness(.93); }
.btn-primary   { background: var(--color-primary);   color: var(--color-text); }
.btn-secondary { background: var(--color-secondary); color: var(--color-text); }
.btn-accent    { background: var(--color-accent);    color: var(--color-text); }
.btn-muted     { background: var(--color-muted);     color: var(--color-text); }`,
  },

  {
    id: "button-states",
    name: "Button States",
    category: "Buttons",
    description: "Disabled and loading states. Disabled buttons drop to 50% opacity and block pointer events.",
    previewHeight: 100,
    html: `<div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
  <button class="btn btn-primary">Save Changes</button>
  <button class="btn btn-primary" disabled>Saving…</button>
  <button class="btn btn-secondary" disabled>Generating...</button>
  <button class="btn btn-muted" disabled>Loading</button>
</div>`,
    css: `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .45rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  font-size: .875rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter .15s ease;
  font-family: inherit;
}
.btn:disabled { opacity: .5; cursor: not-allowed; filter: none; }
.btn-primary   { background: var(--color-primary);   color: var(--color-text); }
.btn-secondary { background: var(--color-secondary); color: var(--color-text); }
.btn-muted     { background: var(--color-muted);     color: var(--color-text); }`,
  },

  {
    id: "button-sizes",
    name: "Button Sizes",
    category: "Buttons",
    description: "Small buttons for inline actions (filter clear, select all), default for primary actions, large for section CTAs like the main dashboard buttons.",
    previewHeight: 110,
    html: `<div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
  <button class="btn btn-primary btn-sm">Select All</button>
  <button class="btn btn-primary">Save Changes</button>
  <button class="btn btn-primary btn-lg">Create Recipe</button>
</div>`,
    css: `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  font-weight: 700;
  cursor: pointer;
  transition: filter .15s ease;
  font-family: inherit;
}
.btn:hover { filter: brightness(.93); }
.btn-sm  { padding: .3rem .85rem; font-size: .8125rem; }
.btn     { padding: .45rem 1.25rem; font-size: .875rem; }
.btn-lg  { padding: .65rem 1.75rem; font-size: 1rem; }
.btn-primary { background: var(--color-primary); color: var(--color-text); }`,
  },

  // ─── FORMS ─────────────────────────────────────────────────────────────────

  {
    id: "text-input",
    name: "Text Input",
    category: "Forms",
    description: "Single-line text field. Focus ring uses the accent coral color. Used in recipe search and all create-recipe fields.",
    previewHeight: 100,
    previewBodyStyle: "padding:1.5rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="display:flex;flex-direction:column;gap:.75rem;width:100%;max-width:360px;">
  <div>
    <label class="label">Search recipes...</label>
    <input class="input" type="text" placeholder="e.g. chicken pasta" />
  </div>
</div>`,
    css: `.label {
  display: block;
  font-size: .75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: .25rem;
}
.input {
  width: 100%;
  padding: .45rem .75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: .875rem;
  font-family: inherit;
  transition: border-color .15s ease;
  box-sizing: border-box;
}
.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(255,181,181,.2);
}
.input::placeholder { color: var(--color-text-secondary); opacity: .6; }`,
  },

  {
    id: "textarea",
    name: "Textarea",
    category: "Forms",
    description: "Multi-line text field. Same styling as the text input, resizable vertically. Used in recipe instructions and contact form.",
    previewHeight: 140,
    previewBodyStyle: "padding:1.5rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="width:100%;max-width:360px;">
  <label class="label">Instructions</label>
  <textarea class="textarea" placeholder="Step 1: Preheat oven to 375°F..."></textarea>
</div>`,
    css: `.label {
  display: block;
  font-size: .75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: .25rem;
}
.textarea {
  width: 100%;
  padding: .45rem .75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: .875rem;
  font-family: inherit;
  transition: border-color .15s ease;
  box-sizing: border-box;
  resize: vertical;
  min-height: 90px;
}
.textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(255,181,181,.2);
}
.textarea::placeholder { color: var(--color-text-secondary); opacity: .6; }`,
  },

  {
    id: "select",
    name: "Select Dropdown",
    category: "Forms",
    description: "Category filter dropdown. Matches input border/radius. Focus uses accent color. Used in the recipe list category filter.",
    previewHeight: 100,
    previewBodyStyle: "padding:1.5rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="width:100%;max-width:220px;">
  <label class="label">Category</label>
  <select class="select">
    <option value="">All</option>
    <option>Breakfast</option>
    <option>Lunch</option>
    <option>Dinner</option>
    <option>Chicken</option>
    <option>Meal Prep</option>
  </select>
</div>`,
    css: `.label {
  display: block;
  font-size: .75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: .25rem;
}
.select {
  width: 100%;
  padding: .45rem .75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: .875rem;
  font-family: inherit;
  transition: border-color .15s ease;
  box-sizing: border-box;
  cursor: pointer;
}
.select:focus {
  outline: none;
  border-color: var(--color-accent);
}`,
  },

  {
    id: "checkbox-row",
    name: "Checkbox Row",
    category: "Forms",
    description: "Checkbox with label. Used in grocery list items and ingredient checklist inside the recipe modal.",
    previewHeight: 160,
    previewBodyStyle: "padding:1.5rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="display:flex;flex-direction:column;gap:.25rem;width:100%;max-width:300px;">
  <label class="checkbox-row" style="background:rgba(168,213,186,.1);">
    <input type="checkbox" checked style="width:1.1rem;height:1.1rem;accent-color:var(--color-primary);cursor:pointer;" />
    <span class="checkbox-text">2 cups rolled oats</span>
  </label>
  <label class="checkbox-row">
    <input type="checkbox" style="width:1.1rem;height:1.1rem;accent-color:var(--color-primary);cursor:pointer;" />
    <span class="checkbox-text">1 tbsp olive oil</span>
  </label>
  <label class="checkbox-row">
    <input type="checkbox" style="width:1.1rem;height:1.1rem;accent-color:var(--color-primary);cursor:pointer;" />
    <span class="checkbox-text checkbox-optional">½ tsp vanilla extract (opt)</span>
  </label>
</div>`,
    css: `.checkbox-row {
  display: flex;
  align-items: center;
  gap: .625rem;
  padding: .4rem .5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background .15s;
}
.checkbox-row:hover { background: var(--color-muted); }
.checkbox-text {
  font-size: .9375rem;
  color: var(--color-text);
}
.checkbox-optional { color: var(--color-text-secondary); font-style: italic; }`,
  },

  // ─── CARDS ─────────────────────────────────────────────────────────────────

  {
    id: "recipe-card",
    name: "Recipe Card",
    category: "Cards",
    description: "The main recipe tile. Background tinted by category color. Shows name, macros, favorite star, and delete icon. Checkbox top-right for meal prep selection.",
    previewHeight: 170,
    previewBodyStyle: "padding:1.25rem;background:var(--color-background);align-items:flex-start;",
    html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;width:100%;">
  <div class="recipe-card" style="background:#FFE5B4;">
    <input type="checkbox" style="position:absolute;top:.75rem;right:.75rem;width:1.1rem;height:1.1rem;accent-color:#a8d5ba;cursor:pointer;" />
    <span class="category-label">Breakfast</span>
    <h2 class="recipe-name">Overnight Oats</h2>
    <div class="macro-row">
      <span>380 cal</span><span>18g P</span><span>8g F</span><span>54g C</span>
    </div>
    <div class="card-actions">
      <span style="font-size:1.1rem;cursor:pointer;color:#ca8a04;">★</span>
      <span style="font-size:.85rem;cursor:pointer;color:var(--color-text-secondary);">🗑</span>
    </div>
  </div>
  <div class="recipe-card" style="background:#D5EAF7;">
    <input type="checkbox" style="position:absolute;top:.75rem;right:.75rem;width:1.1rem;height:1.1rem;accent-color:#a8d5ba;cursor:pointer;" />
    <span class="category-label">Lunch</span>
    <h2 class="recipe-name">Greek Salad Bowl</h2>
    <div class="macro-row">
      <span>290 cal</span><span>12g P</span><span>14g F</span><span>28g C</span>
    </div>
    <div class="card-actions">
      <span style="font-size:1.1rem;cursor:pointer;color:var(--color-text-secondary);">☆</span>
      <span style="font-size:.85rem;cursor:pointer;color:var(--color-text-secondary);">🗑</span>
    </div>
  </div>
</div>`,
    css: `.recipe-card {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: .875rem;
  transition: filter .15s ease, box-shadow .15s ease;
  cursor: pointer;
}
.recipe-card:hover { filter: brightness(.97); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.category-label {
  display: inline-block;
  font-size: .6875rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--color-text-secondary);
  margin-bottom: .25rem;
}
.recipe-name {
  font-size: .9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 .5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.macro-row {
  display: flex;
  gap: .625rem;
  font-size: .75rem;
  color: var(--color-text-secondary);
}
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: .625rem;
}`,
  },

  {
    id: "explore-recipe-card",
    name: "Explore Recipe Card",
    category: "Cards",
    description: "Community recipe card with creator avatar, ingredient preview, and an Add button. Used on the Explore Recipes page.",
    previewHeight: 210,
    previewBodyStyle: "padding:1.25rem;background:var(--color-background);align-items:flex-start;",
    html: `<div class="explore-card" style="background:#E2D1EA;max-width:280px;">
  <div class="explore-avatar">M</div>
  <span class="category-label" style="display:block;margin-bottom:.25rem;">Dinner</span>
  <h2 class="explore-title">🍝 Creamy Carbonara</h2>
  <p class="explore-macros-label">Macros per Serving</p>
  <p class="explore-macros">Calories: 520cal<br>Protein: 28g<br>Fat: 22g</p>
  <div class="explore-footer">
    <button class="btn btn-primary btn-sm">Add</button>
  </div>
</div>`,
    css: `.explore-card {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: .875rem .875rem 3.5rem;
  cursor: pointer;
  transition: filter .15s;
  overflow: hidden;
  width: 100%;
}
.explore-card:hover { filter: brightness(.97); }
.explore-avatar {
  position: absolute;
  top: .75rem; right: .75rem;
  width: 2.75rem; height: 2.75rem;
  border-radius: 50%;
  background: #ffd54f;
  border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center;
  font-size: .875rem; font-weight: 700;
  color: var(--color-text);
}
.explore-title {
  font-size: 1.125rem; font-weight: 700;
  color: var(--color-text);
  margin: .25rem 0 .5rem;
  padding-right: 3.5rem;
}
.explore-macros-label {
  font-size: .875rem; font-weight: 700;
  color: var(--color-text); margin: .5rem 0 .25rem;
}
.explore-macros { font-size: .875rem; color: var(--color-text); margin: 0; }
.explore-footer {
  position: absolute; bottom: .75rem; right: .875rem;
}
.category-label {
  font-size: .6875rem; text-transform: uppercase;
  letter-spacing: .05em; color: var(--color-text-secondary);
}
.btn { display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--color-border);border-radius:var(--radius-xl);font-weight:700;cursor:pointer;font-family:inherit;transition:filter .15s;}
.btn:hover{filter:brightness(.93);}
.btn-primary{background:var(--color-primary);color:var(--color-text);}
.btn-sm{padding:.3rem .85rem;font-size:.8125rem;}`,
  },

  {
    id: "macro-display",
    name: "Macro Display Row",
    category: "Cards",
    description: "Inline macro summary bar used inside the recipe detail modal. Shows calories, protein, carbs, and fat separated by pipes.",
    previewHeight: 80,
    html: `<div class="macro-bar">
  <span class="macro-item"><span class="macro-val macro-cal">380</span> cal</span>
  <span class="macro-sep">|</span>
  <span class="macro-item"><span class="macro-val macro-protein">28g</span> protein</span>
  <span class="macro-sep">|</span>
  <span class="macro-item"><span class="macro-val macro-carbs">42g</span> carbs</span>
  <span class="macro-sep">|</span>
  <span class="macro-item"><span class="macro-val macro-fat">9g</span> fat</span>
</div>`,
    css: `.macro-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .625rem 1rem;
  background: rgba(247,250,252,.5);
  font-size: .9375rem;
  color: var(--color-text);
  font-weight: 500;
}
.macro-val { font-weight: 700; }
.macro-cal     { color: var(--color-accent); }
.macro-protein { color: var(--color-primary); }
.macro-carbs   { color: var(--color-secondary); }
.macro-fat     { color: var(--color-primary); }
.macro-sep     { color: var(--color-border); }`,
  },

  // ─── FEEDBACK ──────────────────────────────────────────────────────────────

  {
    id: "loading-state",
    name: "Loading State",
    category: "Feedback",
    description: "Full-section loading placeholder with animated pulse. Used when recipes or data are being fetched from the API.",
    previewHeight: 160,
    html: `<div class="loading-state">
  <div class="loading-icon">🍳</div>
  <p class="loading-text">Loading your recipes...</p>
</div>`,
    css: `@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .45; }
}
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: .75rem;
}
.loading-icon {
  font-size: 3.5rem;
  animation: pulse 1.6s ease-in-out infinite;
}
.loading-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}`,
  },

  {
    id: "empty-state",
    name: "Empty State",
    category: "Feedback",
    description: "Shown when a user has no recipes yet. Combines an emoji, headline, and a supporting CTA nudge.",
    previewHeight: 170,
    html: `<div class="empty-state">
  <div class="empty-icon">📝</div>
  <p class="empty-title">No recipes yet!</p>
  <p class="empty-sub">Click "Create Recipe" to add your first recipe</p>
</div>`,
    css: `.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: .5rem;
}
.empty-icon { font-size: 3.5rem; }
.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: .25rem 0 0;
}
.empty-sub {
  font-size: .9rem;
  color: var(--color-text-secondary);
  margin: 0;
}`,
  },

  {
    id: "error-state",
    name: "Error Banner",
    category: "Feedback",
    description: "Red-tinted error container with a warning prefix. Used for API failures and validation errors on the dashboard.",
    previewHeight: 100,
    previewBodyStyle: "padding:1.25rem;background:var(--color-background);align-items:flex-start;",
    html: `<div class="error-banner">
  <p class="error-text">⚠️ Failed to load recipes. Please try again.</p>
</div>`,
    css: `.error-banner {
  border: 1px solid #f87171;
  border-radius: 1.5rem;
  padding: .875rem 1.25rem;
  background: #fef2f2;
}
.error-text {
  color: #b91c1c;
  font-weight: 600;
  margin: 0;
  font-size: .9375rem;
}`,
  },

  // ─── NAVIGATION ────────────────────────────────────────────────────────────

  {
    id: "tab-toggle",
    name: "Tab Toggle",
    category: "Navigation",
    description: "Two-option pill toggle. Active tab gets a white card background with border; inactive is flat on the muted track. Used in the Getting Started sidebar.",
    previewHeight: 90,
    html: `<div class="tab-track">
  <button class="tab tab-active">I Meal Prep</button>
  <button class="tab">I Track Macros</button>
</div>`,
    css: `.tab-track {
  display: flex;
  gap: .375rem;
  padding: .25rem;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  width: fit-content;
}
.tab {
  flex: 1;
  padding: .55rem .875rem;
  border-radius: .75rem;
  font-size: .875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s, color .2s;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
}
.tab:hover { color: var(--color-text); }
.tab-active {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}`,
  },

  {
    id: "filter-chips",
    name: "Category Filter Chips",
    category: "Navigation",
    description: "Horizontal scrollable row of filter chips. The active chip gets the primary sage-green background. Used to filter recipe categories.",
    previewHeight: 90,
    html: `<div class="chips-row">
  <button class="chip chip-active">All</button>
  <button class="chip">Breakfast</button>
  <button class="chip">Lunch</button>
  <button class="chip">Dinner</button>
  <button class="chip">Chicken</button>
  <button class="chip">Meal Prep</button>
</div>`,
    css: `.chips-row {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: .3rem .85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: .8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, color .15s;
  font-family: inherit;
}
.chip:hover { background: var(--color-muted); }
.chip-active {
  background: var(--color-primary);
  color: var(--color-text);
  border-color: var(--color-primary);
}`,
  },

  {
    id: "search-bar",
    name: "Search Bar + Filter",
    category: "Navigation",
    description: "The recipe search row: category select on the left, text input in the middle, and a clear button. Matches dashboard toolbar.",
    previewHeight: 90,
    previewBodyStyle: "padding:1.25rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div class="search-row">
  <select class="select" style="min-width:130px;">
    <option>All</option>
    <option>Breakfast</option>
    <option>Dinner</option>
  </select>
  <input class="input" type="text" placeholder="Search recipes or ingredients..." style="flex:1;" />
  <button class="btn btn-accent btn-sm">Clear</button>
</div>`,
    css: `.search-row {
  display: flex;
  gap: .5rem;
  align-items: center;
  width: 100%;
}
.select, .input {
  padding: .45rem .75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: .875rem;
  font-family: inherit;
  transition: border-color .15s;
  box-sizing: border-box;
}
.select:focus, .input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.input::placeholder { color: var(--color-text-secondary); opacity: .6; }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-border); border-radius: var(--radius-xl);
  font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s;
  white-space: nowrap;
}
.btn:hover { filter: brightness(.93); }
.btn-accent { background: var(--color-accent); color: var(--color-text); }
.btn-sm { padding: .3rem .85rem; font-size: .8125rem; }`,
  },

  // ─── LAYOUT ────────────────────────────────────────────────────────────────

  {
    id: "section-container",
    name: "Section Container",
    category: "Layout",
    description: "Standard section wrapper with surface background, border, and rounded-3xl corners. Contains most dashboard panels.",
    previewHeight: 130,
    previewBodyStyle: "padding:1.25rem;background:var(--color-background);align-items:flex-start;",
    html: `<div class="section-wrap" style="width:100%;">
  <h2 class="section-title">🛒 Your Grocery List</h2>
  <p class="section-sub">Select recipes above, then hit Generate Grocery List.</p>
</div>`,
    css: `.section-wrap {
  border: 1px solid var(--color-border);
  border-radius: 1.5rem;
  background: var(--color-surface);
  padding: 1.25rem 1.5rem;
}
.section-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 .25rem;
}
.section-sub {
  font-size: .875rem;
  color: var(--color-text-secondary);
  margin: 0;
}`,
  },

  {
    id: "grocery-item",
    name: "Grocery List Item",
    category: "Layout",
    description: "Checkable grocery item tile. Checked items show a primary-tinted background; unchecked are muted and struck through.",
    previewHeight: 175,
    previewBodyStyle: "padding:1.25rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;width:100%;">
  <div class="grocery-item grocery-checked">
    <input type="checkbox" checked style="width:1.2rem;height:1.2rem;accent-color:var(--color-primary);pointer-events:none;" />
    <span class="grocery-label">2 cups rolled oats</span>
  </div>
  <div class="grocery-item grocery-checked">
    <input type="checkbox" checked style="width:1.2rem;height:1.2rem;accent-color:var(--color-primary);pointer-events:none;" />
    <span class="grocery-label">1 tbsp olive oil</span>
  </div>
  <div class="grocery-item grocery-unchecked">
    <input type="checkbox" style="width:1.2rem;height:1.2rem;accent-color:var(--color-primary);pointer-events:none;" />
    <span class="grocery-label" style="text-decoration:line-through;">½ cup berries</span>
  </div>
  <div class="grocery-item grocery-checked">
    <input type="checkbox" checked style="width:1.2rem;height:1.2rem;accent-color:var(--color-primary);pointer-events:none;" />
    <span class="grocery-label">3 cloves garlic</span>
  </div>
</div>`,
    css: `.grocery-item {
  display: flex;
  align-items: center;
  gap: .625rem;
  padding: .5rem .75rem;
  border: 1px solid var(--color-border);
  border-radius: .75rem;
  cursor: pointer;
  transition: background .15s;
}
.grocery-checked  { background: rgba(168,213,186,.1); }
.grocery-unchecked { background: var(--color-muted); opacity: .65; }
.grocery-label {
  font-size: .9rem;
  color: var(--color-text);
  font-weight: 500;
}`,
  },

  {
    id: "step-item",
    name: "Step Item",
    category: "Layout",
    description: "Numbered workflow step with connector line. Used in the Getting Started sidebar to guide users through meal prep or macro tracking.",
    previewHeight: 200,
    previewBodyStyle: "padding:1.5rem;background:var(--color-surface);align-items:flex-start;",
    html: `<div style="display:flex;flex-direction:column;gap:0;width:100%;max-width:300px;">
  <div class="step-row">
    <div class="step-col">
      <div class="step-icon" style="background:rgba(255,229,180,.4);">📖</div>
      <div class="step-line"></div>
    </div>
    <div class="step-content">
      <p class="step-title"><span class="step-num">1.</span> Add Recipes</p>
      <p class="step-desc">Browse community recipes or create your own with Create Recipe.</p>
    </div>
  </div>
  <div class="step-row">
    <div class="step-col">
      <div class="step-icon" style="background:rgba(168,213,186,.25);">✅</div>
      <div class="step-line"></div>
    </div>
    <div class="step-content">
      <p class="step-title"><span class="step-num">2.</span> Select Recipes</p>
      <p class="step-desc">Check the box on any recipe card to add it to your meal plan.</p>
    </div>
  </div>
  <div class="step-row">
    <div class="step-col">
      <div class="step-icon" style="background:rgba(255,181,181,.25);">☑️</div>
    </div>
    <div class="step-content">
      <p class="step-title"><span class="step-num">3.</span> Generate Grocery List</p>
      <p class="step-desc">Hit Generate to combine ingredients into one organized list.</p>
    </div>
  </div>
</div>`,
    css: `.step-row {
  display: flex;
  gap: .875rem;
  align-items: flex-start;
}
.step-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.step-icon {
  width: 2.25rem; height: 2.25rem;
  border-radius: .75rem;
  border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
}
.step-line {
  width: 2px;
  height: 1.25rem;
  background: var(--color-border);
  margin-top: .375rem;
}
.step-content {
  padding-bottom: .875rem;
}
.step-title {
  font-size: .875rem; font-weight: 700;
  color: var(--color-text); margin: .125rem 0 .2rem;
}
.step-num { color: var(--color-text-secondary); margin-right: .25rem; }
.step-desc { font-size: .75rem; color: var(--color-text-secondary); margin: 0; line-height: 1.4; }`,
  },

  // ─── OVERLAYS ──────────────────────────────────────────────────────────────

  {
    id: "recipe-modal-header",
    name: "Recipe Modal Header",
    category: "Overlays",
    description: "The top section of the recipe detail modal. Gradient accent bar, emoji + title, category/serving pills, and the inline macro summary.",
    previewHeight: 220,
    previewBodyStyle: "padding:0;background:var(--color-background);overflow:hidden;align-items:flex-start;",
    html: `<div class="modal-card" style="width:100%;">
  <div class="gradient-bar"></div>
  <div class="modal-title-section">
    <div style="display:flex;align-items:center;justify-content:center;gap:.5rem;">
      <span style="font-size:2.75rem;">🍝</span>
      <h1 class="modal-title">Creamy Carbonara</h1>
    </div>
    <div class="modal-pills">
      <span class="pill">Dinner</span>
      <span class="pill">4 servings</span>
      <span class="pill">👩‍🍳 25m</span>
      <span class="pill">⏱️ 35m</span>
    </div>
  </div>
  <div class="macro-bar">
    <span><span class="macro-cal">520</span> cal</span>
    <span class="macro-sep">|</span>
    <span><span class="macro-protein">28g</span> protein</span>
    <span class="macro-sep">|</span>
    <span><span class="macro-carbs">58g</span> carbs</span>
    <span class="macro-sep">|</span>
    <span><span class="macro-fat">18g</span> fat</span>
  </div>
  <div class="gradient-bar"></div>
</div>`,
    css: `.modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  overflow: hidden;
}
.gradient-bar {
  height: .5rem;
  background: linear-gradient(to right, rgba(168,213,186,.2), rgba(255,229,180,.2), rgba(168,213,186,.2));
}
.modal-title-section {
  padding: .875rem 1rem .625rem;
  text-align: center;
  border-bottom: 1px dashed rgba(226,232,240,.7);
}
.modal-title {
  font-size: 1.75rem; font-weight: 700;
  color: var(--color-text); margin: 0;
}
.modal-pills {
  display: flex; flex-wrap: wrap;
  gap: .4rem; justify-content: center; margin-top: .375rem;
}
.pill {
  padding: .15rem .6rem;
  background: var(--color-muted);
  border-radius: var(--radius-full);
  font-size: .8125rem; color: var(--color-text-secondary);
}
.macro-bar {
  display: flex; flex-wrap: wrap; gap: .5rem;
  align-items: center; justify-content: center;
  padding: .5rem; font-size: .9375rem;
  color: var(--color-text); font-weight: 500;
  background: rgba(247,250,252,.5);
}
.macro-cal     { color: var(--color-accent);    font-weight: 700; }
.macro-protein { color: var(--color-primary);   font-weight: 700; }
.macro-carbs   { color: var(--color-secondary); font-weight: 700; }
.macro-fat     { color: var(--color-primary);   font-weight: 700; }
.macro-sep     { color: var(--color-border); }`,
  },

  {
    id: "modal-action-buttons",
    name: "Modal Action Buttons",
    category: "Overlays",
    description: "Footer button row for modals. Close on the left (muted), Edit (primary), View (secondary), and destructive trash icon button.",
    previewHeight: 100,
    html: `<div class="modal-footer">
  <button class="btn btn-close">Close</button>
  <button class="btn btn-primary-sm">Edit</button>
  <button class="btn btn-secondary-sm">View</button>
  <button class="btn btn-icon" aria-label="Delete">🗑</button>
</div>`,
    css: `.modal-footer {
  display: flex;
  justify-content: center;
  gap: .75rem;
  align-items: center;
}
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: .45rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: .75rem;
  font-size: .875rem; font-weight: 700;
  cursor: pointer; font-family: inherit;
  transition: background .15s, filter .15s;
}
.btn:hover { filter: brightness(.93); }
.btn-close       { background: var(--color-surface); color: var(--color-text); }
.btn-close:hover { background: var(--color-muted); }
.btn-primary-sm  { background: var(--color-primary);   color: var(--color-text); }
.btn-secondary-sm{ background: var(--color-secondary); color: var(--color-text); }
.btn-icon        { background: var(--color-background); color: var(--color-text); padding: .45rem .625rem; font-size: 1rem; }`,
  },

  {
    id: "getting-started-sidebar",
    name: "Getting Started Sidebar",
    category: "Overlays",
    description: "Slide-in guide panel with fixed position, muted context box, and a workflow toggle. Appears on the dashboard for first-time users.",
    previewHeight: 300,
    previewBodyStyle: "padding:0;overflow:hidden;background:var(--color-background);align-items:flex-start;",
    html: `<div class="sidebar-panel">
  <h2 class="sidebar-heading">Getting Started</h2>
  <p class="sidebar-sub">Choose how you want to use Let Em Cook</p>
  <div class="tab-track" style="margin-bottom:1rem;">
    <button class="tab tab-active">I Meal Prep</button>
    <button class="tab">I Track Macros</button>
  </div>
  <div class="sidebar-context">
    Plan your meals ahead of time. Add recipes, build a weekly calendar, and generate a grocery list before you shop.
  </div>
  <div class="sidebar-pro-tip">
    <p class="pro-tip-label">Pro tip</p>
    <p class="pro-tip-text">You can do both! Use the calendar to plan, then the Macro Tracker to log what you actually ate.</p>
  </div>
  <button class="btn btn-primary" style="width:100%;margin-top:1rem;">Got it, let me cook!</button>
</div>`,
    css: `.sidebar-panel {
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  padding: 1.25rem;
  width: 280px;
  min-height: 100%;
  box-sizing: border-box;
}
.sidebar-heading { font-size: 1.125rem; font-weight: 800; color: var(--color-text); margin: 0 0 .2rem; }
.sidebar-sub { font-size: .8125rem; color: var(--color-text-secondary); margin: 0 0 1rem; }
.sidebar-context {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: .75rem;
  font-size: .75rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
}
.sidebar-pro-tip {
  background: rgba(168,213,186,.1);
  border: 1px solid rgba(168,213,186,.25);
  border-radius: 1rem;
  padding: .75rem;
}
.pro-tip-label { font-size: .75rem; font-weight: 700; color: var(--color-text); margin: 0 0 .2rem; }
.pro-tip-text  { font-size: .75rem; color: var(--color-text-secondary); margin: 0; line-height: 1.4; }
.tab-track {
  display: flex; gap: .375rem; padding: .25rem;
  background: var(--color-muted);
  border: 1px solid var(--color-border); border-radius: 1rem;
}
.tab {
  flex: 1; padding: .5rem .5rem; border-radius: .75rem;
  font-size: .8125rem; font-weight: 600; cursor: pointer;
  transition: background .2s; border: none; background: transparent;
  color: var(--color-text-secondary); font-family: inherit;
}
.tab-active { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: .6rem 1.25rem; border: 1px solid var(--color-border);
  border-radius: 1rem; font-size: .875rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: filter .15s;
}
.btn:hover { filter: brightness(.93); }
.btn-primary { background: var(--color-primary); color: var(--color-text); }`,
  },
];
