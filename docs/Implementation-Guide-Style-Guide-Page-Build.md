-- Bootstrap lazy.nvim# Implementation Guide — Living Style Guide Page

**Purpose:** Step-by-step instructions for building a living component style guide into any Next.js app. Hand this document to an LLM or developer to replicate the pattern exactly.

**What you get:**
- A `/style-guide` route with a Pinterest-style masonry grid of all UI elements
- Every element rendered live in an isolated `<iframe>` — no CSS bleed
- Click any element → full-screen sandbox: CodeMirror CSS editor on the left, live preview on the right
- Reset / Copy CSS / Copy HTML buttons
- Category filter chips + search
- No backend, no database, no authentication

---

## 1. Install dependencies

```bash
npm install @uiw/react-codemirror @codemirror/lang-css @uiw/codemirror-theme-github
```

- `@uiw/react-codemirror` — React wrapper for CodeMirror 6
- `@codemirror/lang-css` — CSS language extension (syntax highlighting + autocomplete)
- `@uiw/codemirror-theme-github` — Clean light theme (`githubLight`)

---

## 2. File structure

Create three files:

```
app/style-guide/
├── page.tsx                  ← main page (client component)
├── styleGuide.module.css     ← page layout only (masonry, cards, modal)
└── data/
    └── elements.ts           ← the element catalog (HTML + CSS for each element)
```

No new API routes, no layout wrapper, no authentication needed.

---

## 3. `data/elements.ts` — the catalog

This is the heart of the page. It contains:

1. **`ROOT_CSS`** — the full `:root` CSS variable block from your `globals.css`, plus box-sizing reset and base body styles. This is injected into every iframe so CSS variables work.

2. **`SHARED_CSS`** — all reusable class definitions (buttons, inputs, cards, chips, etc.) from your global stylesheet. Injected into every iframe so elements render correctly without needing the full globals file.

3. **`ELEMENTS` array** — one entry per catalogued element.

### Element shape

```typescript
export interface StyleElement {
  id: string;              // unique slug, e.g. "button-primary"
  name: string;            // display name, e.g. "Primary Button"
  category: Category;      // one of your defined categories
  description: string;     // one sentence explaining when to use it
  html: string;            // the HTML markup (template literal)
  css: string;             // the CSS classes (template literal, shown in editor)
  previewHeight?: number;  // iframe height in preview cards (default 160)
  previewBodyStyle?: string; // overrides body style inside the preview iframe
}
```

### Categories

Define a union type for your categories:

```typescript
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
  "Foundations", "Buttons", "Forms", "Cards",
  "Feedback", "Navigation", "Layout", "Overlays",
];
```

### ROOT_CSS

Copy your entire `:root` block from globals.css plus the base reset:

```typescript
export const ROOT_CSS = `
*,*::before,*::after{box-sizing:border-box;}
:root{
  --your-color-token: #value;
  /* ... all CSS custom properties ... */
}
body{margin:0;font-family:var(--font-sans);background:var(--page-bg);color:var(--text-main);font-size:16px;line-height:1.5;}
`;
```

**Why this matters:** The iframe is a completely separate document. Without injecting the `:root` block, `var(--brookfield-blue)` etc. won't resolve and everything will look wrong.

### SHARED_CSS

Copy the most-used CSS classes from your globals, minified into a single string:

```typescript
export const SHARED_CSS = `
.button-primary{display:inline-flex;...}
.input{width:100%;...}
.card{background:var(--card-bg);...}
/* etc. */
`;
```

This lets element `html` snippets use class names like `class="button-primary"` and have them render correctly in the iframe, while the `css` field only needs to contain the classes being demonstrated (for the editor).

### Writing element entries

Each entry has:
- `html`: the actual markup to render. Use real class names from your app.
- `css`: the CSS definitions for those classes — this is what appears in the CodeMirror editor and what the user edits. Write it cleanly with indentation.
- `previewBodyStyle`: controls how the element is positioned inside the preview card's iframe. Default is centered flex. For elements that should be left-aligned (forms, tables), use `"padding:1.5rem;background:#fff;align-items:flex-start;"`.

**Example entry:**

```typescript
{
  id: "button-primary",
  name: "Primary Button",
  category: "Buttons",
  description: "Main CTA. Pill-shaped, brand-green. Use for Save, Confirm, Create actions.",
  previewHeight: 100,
  html: `<div style="display:flex;gap:1rem;align-items:center">
  <button class="button-primary">Save Changes</button>
  <button class="button-primary" disabled>Saving…</button>
</div>`,
  css: `.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .4rem .9rem;
  border-radius: 999px;
  border: none;
  font-size: .85rem;
  font-weight: 600;
  background-color: var(--brand-green, #00664f);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
}
.button-primary:hover { filter: brightness(1.05); }
.button-primary:disabled { opacity: .6; cursor: default; }`,
},
```

### Recommended elements to catalog

Organize them into these categories, roughly in this order:

**Foundations:** Color palette (rendered as swatches), Typography scale, Shadows & border radius  
**Buttons:** Primary, Secondary, Danger, Legacy btn variants, Button group  
**Forms:** Text input, Textarea, Select/dropdown, Custom picker trigger with chips  
**Cards:** Basic content card, Two-column detail grid layout  
**Feedback:** Status pills (all states with animations), Criticality chips, Count badge, Empty state, Status badge  
**Navigation:** Tab bar, Filter chips bar, Sidebar nav item  
**Layout:** Data table, Search toolbar, Key-value metadata list, Color legend, Batch status row  
**Overlays:** Modal/recipe card pattern, Checkbox picker modal, PIN entry dialog  

---

## 4. The `srcdoc` builder function

This is what generates the HTML injected into each `<iframe>`. Write it once and reuse it everywhere:

```typescript
function buildSrcdoc(
  elementCss: string,
  html: string,
  bodyStyle = "display:flex;align-items:center;justify-content:center;padding:1.5rem;min-height:100vh;"
): string {
  return `<!DOCTYPE html><html><head>
<style>${ROOT_CSS}</style>
<style>${SHARED_CSS}</style>
<style>body{${bodyStyle}}</style>
<style>${elementCss}</style>
</head><body>${html}</body></html>`;
}
```

**Why `<iframe>` with `srcdoc` instead of a styled `<div>`:**
- Complete CSS isolation — user edits cannot break the rest of the page
- No class name collisions
- No z-index battles with the app's own styles
- User can write arbitrary CSS including animations, `:hover`, `@keyframes`

The `sandbox="allow-same-origin"` attribute on the iframe allows CSS to work while blocking JavaScript execution.

---

## 5. `styleGuide.module.css` — layout styles

This file only handles the style guide page's own layout. It does NOT go into `globals.css`. Key sections:

### Page shell
```css
.page { min-height:100vh; background:var(--page-bg); font-family:var(--font-sans); }
```

### Sticky controls bar
```css
.controls {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--card-bg);
  border-bottom: 1px solid var(--hairline);
  padding: 0.75rem 2.5rem;
  box-shadow: 0 2px 8px rgba(15,53,87,.06);
}
```

### Masonry grid — CSS columns approach (no JS)
```css
.grid {
  max-width: 1400px;
  margin: 2rem auto;
  padding: 0 2.5rem 4rem;
  columns: 3;
  column-gap: 1.25rem;
}
@media (max-width: 1100px) { .grid { columns: 2; } }
@media (max-width: 680px)  { .grid { columns: 1; } }
```

Each card must have `break-inside: avoid` to prevent cards from splitting across columns.

### Preview cards — the resting + hover shadow
```css
.previewCard {
  break-inside: avoid;
  margin-bottom: 1.25rem;
  background: var(--card-bg);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(15,53,87,.13), 0 1px 4px rgba(15,53,87,.08);
  transition: box-shadow 0.25s ease, transform 0.2s ease, border-color 0.2s;
}
.previewCard:hover {
  box-shadow: 0 16px 48px rgba(15,53,87,.18), 0 4px 12px rgba(15,53,87,.12);
  transform: translateY(-4px);
}
```

### Hover overlay label
```css
.previewHoverLabel {
  position: absolute;
  inset: 0;
  background: rgba(15,53,87,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
  font-weight: 600;
}
.previewCard:hover .previewHoverLabel { opacity: 1; }
```

### Sandbox modal
```css
.sandboxModal {
  background: var(--card-bg);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  width: 100%;
  max-width: 1100px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Two-column body: editor left, preview right */
.sandboxBody {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  overflow: hidden;
  min-height: 0; /* critical — prevents grid from overflowing */
}
```

---

## 6. `page.tsx` — the main component

The page is a single `"use client"` component. Key state:

```typescript
const [selected, setSelected] = useState<StyleElement | null>(null);
const [editedCss, setEditedCss] = useState("");
const [search, setSearch] = useState("");
const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
const [copied, setCopied] = useState<"css" | "html" | null>(null);
```

### Reset editor when element changes
```typescript
useEffect(() => {
  if (selected) setEditedCss(selected.css);
}, [selected?.id]);  // depend on id, not the whole object
```

### Compute sandbox srcdoc reactively
```typescript
const sandboxSrc = useMemo(
  () => selected ? buildSrcdoc(editedCss, selected.html, selected.previewBodyStyle) : "",
  [editedCss, selected?.html, selected?.previewBodyStyle]
);
```

Every keystroke in the editor updates `editedCss` → `sandboxSrc` recomputes → iframe `srcDoc` prop changes → browser re-renders the preview. No debounce needed at this scale.

### Filter elements
```typescript
const filtered = useMemo(() => {
  const q = search.toLowerCase().trim();
  return ELEMENTS.filter((el) => {
    if (activeCategory !== "All" && el.category !== activeCategory) return false;
    if (!q) return true;
    return el.name.toLowerCase().includes(q) || el.description.toLowerCase().includes(q);
  });
}, [search, activeCategory]);
```

### Copy to clipboard with flash feedback
```typescript
async function copy(type: "css" | "html") {
  const text = type === "css" ? editedCss : selected?.html ?? "";
  await navigator.clipboard.writeText(text);
  setCopied(type);
  setTimeout(() => setCopied(null), 1800);
}
```

### CodeMirror component
```tsx
import CodeMirror from "@uiw/react-codemirror";
import { css as cssLang } from "@codemirror/lang-css";
import { githubLight } from "@uiw/codemirror-theme-github";

<CodeMirror
  value={editedCss}
  onChange={setEditedCss}
  extensions={[cssLang()]}
  theme={githubLight}
  style={{ fontSize: "13px", height: "100%", minHeight: "300px" }}
  basicSetup={{
    lineNumbers: true,
    foldGutter: false,
    dropCursor: false,
    allowMultipleSelections: false,
    indentOnInput: true,
  }}
/>
```

### Preview card component
Each card in the masonry grid:

```tsx
function PreviewCard({ element, onClick }) {
  // Memoize srcdoc so it doesn't rebuild on unrelated state changes
  const src = useMemo(
    () => buildSrcdoc(element.css, element.html, element.previewBodyStyle),
    [element.id]  // only rebuild when the element itself changes
  );

  return (
    <div className={styles.previewCard} onClick={onClick}>
      <iframe
        className={styles.previewFrame}
        srcDoc={src}
        height={element.previewHeight ?? 160}
        sandbox="allow-same-origin"
        scrolling="no"
      />
      <div className={styles.previewFooter}>
        <span className={styles.previewName}>{element.name}</span>
        <span className={styles.previewCategory}>{element.category}</span>
      </div>
      <div className={styles.previewHoverLabel}>Open sandbox →</div>
    </div>
  );
}
```

### Sandbox modal structure
```
sandboxOverlay (fixed, full screen, backdrop)
└── sandboxModal (flex column, max-width 1100px)
    ├── sandboxHeader (blue, title + description + close button)
    ├── sandboxBody (grid 1fr 1fr)
    │   ├── sandboxLeft
    │   │   ├── sandboxPanelLabel ("CSS — edit and see changes live")
    │   │   └── editorWrap → <CodeMirror />
    │   └── sandboxRight
    │       ├── sandboxPanelLabel ("Preview — live")
    │       └── <iframe srcDoc={sandboxSrc} />
    └── sandboxFooter
        ├── <code> HTML snippet (truncated to 120 chars)
        └── footerActions: Reset | Copy CSS | Copy HTML
```

### Close sandbox on Esc
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setSelected(null);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

---

## 7. Routing

No configuration needed. Next.js picks up `/style-guide` automatically from `app/style-guide/page.tsx`.

The page has **no navigation link** pointing to it — access it directly via URL. This is intentional: it's a dev tool, not a user-facing feature.

If you want to add a link, add it to your app's sidebar or header navigation:
```tsx
<a href="/style-guide">Style Guide</a>
```

---

## 8. Maintaining the catalog

When you add a new UI pattern to the app, add an entry to `ELEMENTS` in `data/elements.ts`.

A good entry has:
- **`html`** that uses real class names from the app — don't simplify
- **`css`** that is the actual CSS from your globals, not a stripped version — this is educational
- **`description`** that says *when* to use it, not just what it is
- **`previewHeight`** tuned so the element is fully visible in the preview card without scrolling

### Tips for `previewBodyStyle`
- Forms and tables: `"padding:1.5rem;background:#fff;align-items:flex-start;"` — left-aligned
- Modals/overlays: `"padding:0;overflow:hidden;background:rgba(0,0,0,.5);align-items:center;justify-content:center;"` — dark backdrop
- Default (most elements): centered flex — omit this prop

### Tips for preview card height
- Simple buttons: 90–110px
- Form fields: 110–160px
- Tables: 180–220px
- Modals rendered directly (not in overlay): 280–340px
- Color palette / typography: 220–280px

---

## 9. Common issues

**iframes show blank / CSS variables don't resolve**  
→ `ROOT_CSS` is missing or not being injected. Check that `buildSrcdoc` includes `${ROOT_CSS}` before `${elementCss}`.

**CodeMirror not rendering / SSR error**  
→ The page must be `"use client"`. If you're seeing a hydration error, check there's no server component trying to render CodeMirror.

**Masonry cards split mid-card**  
→ Missing `break-inside: avoid` on `.previewCard`. This is required for CSS columns masonry to work.

**Sandbox modal overflows on small screens**  
→ Add `@media (max-width: 800px) { .sandboxBody { grid-template-columns: 1fr; } }` to stack editor and preview vertically.

**`min-height: 0` on `.sandboxBody`**  
→ This is not optional. Without it, the CSS grid inside a flex container will ignore `overflow: hidden` and the editor will expand beyond the modal height.

---

## 10. Adapting for a different project

To port this to a new project:

1. **Replace `ROOT_CSS`** with the new project's CSS variable block
2. **Replace `SHARED_CSS`** with the new project's global utility classes
3. **Replace `ELEMENTS`** with entries for the new project's components
4. **Keep `buildSrcdoc`, `page.tsx`, and `styleGuide.module.css` unchanged** — they're project-agnostic

The only project-specific content lives in `data/elements.ts`. Everything else is boilerplate.
