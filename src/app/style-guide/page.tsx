"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { css as cssLang } from "@codemirror/lang-css";
import { githubLight } from "@uiw/codemirror-theme-github";
import styles from "./styleGuide.module.css";
import {
  ELEMENTS,
  CATEGORIES,
  ROOT_CSS,
  SHARED_CSS,
  BRAND_COLORS,
  CATEGORY_COLORS,
  StyleElement,
  Category,
} from "./data/elements";

// ── Types ──────────────────────────────────────────────────────────────────

type ColorFormat =
  | "css"
  | "scss"
  | "less"
  | "json"
  | "figma-tokens"
  | "tailwind"
  | "markdown";

const COLOR_FORMAT_LABELS: [ColorFormat, string][] = [
  ["css",          "CSS Variables"],
  ["scss",         "SCSS Variables"],
  ["less",         "LESS Variables"],
  ["json",         "JSON"],
  ["figma-tokens", "Figma / Design Tokens"],
  ["tailwind",     "Tailwind Config"],
  ["markdown",     "Markdown Table"],
];

// ── Helpers ────────────────────────────────────────────────────────────────

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

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-");
}

// ── Color palette generators ───────────────────────────────────────────────

function generateColorPalette(format: ColorFormat) {
  const brand = BRAND_COLORS;
  const cat = CATEGORY_COLORS;

  switch (format) {
    case "css": {
      const lines = [
        "/* Let Em Cook — Color Palette */",
        ":root {",
        "  /* Brand Colors */",
        ...brand.map(c => `  ${c.cssVar}: ${c.hex}; /* ${c.name} */`),
        "",
        "  /* Category Colors */",
        ...cat.map(c => `  --color-cat-${slugify(c.name)}: ${c.hex};`),
        "}",
      ];
      downloadFile(lines.join("\n"), "let-em-cook-colors.css", "text/css");
      break;
    }
    case "scss": {
      const lines = [
        "// Let Em Cook — Color Palette",
        "// Brand Colors",
        ...brand.map(c => `$${c.cssVar.slice(2)}: ${c.hex}; // ${c.name}`),
        "",
        "// Category Colors",
        ...cat.map(c => `$color-cat-${slugify(c.name)}: ${c.hex};`),
      ];
      downloadFile(lines.join("\n"), "let-em-cook-colors.scss", "text/plain");
      break;
    }
    case "less": {
      const lines = [
        "// Let Em Cook — Color Palette",
        "// Brand Colors",
        ...brand.map(c => `@${c.cssVar.slice(2)}: ${c.hex}; // ${c.name}`),
        "",
        "// Category Colors",
        ...cat.map(c => `@color-cat-${slugify(c.name)}: ${c.hex};`),
      ];
      downloadFile(lines.join("\n"), "let-em-cook-colors.less", "text/plain");
      break;
    }
    case "json": {
      const obj: Record<string, string> = {};
      for (const c of brand) obj[c.cssVar.slice(2)] = c.hex;
      for (const c of cat)   obj[`color-cat-${slugify(c.name)}`] = c.hex;
      downloadFile(JSON.stringify(obj, null, 2), "let-em-cook-colors.json", "application/json");
      break;
    }
    case "figma-tokens": {
      const brandTokens: Record<string, unknown> = {};
      for (const c of brand) {
        brandTokens[c.cssVar.slice(2)] = { $type: "color", $value: c.hex, $description: `${c.name} (${c.group})` };
      }
      const catTokens: Record<string, unknown> = {};
      for (const c of cat) {
        catTokens[`cat-${slugify(c.name)}`] = { $type: "color", $value: c.hex, $description: `${c.name} category` };
      }
      const tokens = { brand: brandTokens, category: catTokens };
      downloadFile(JSON.stringify(tokens, null, 2), "let-em-cook-tokens.json", "application/json");
      break;
    }
    case "tailwind": {
      const colors: Record<string, string> = {};
      for (const c of brand) colors[c.cssVar.slice(8)] = c.hex; // strip '--color-'
      const catColors: Record<string, string> = {};
      for (const c of cat)   catColors[slugify(c.name)] = c.hex;
      const config = { theme: { extend: { colors: { ...colors, category: catColors } } } };
      const content = `/** @type {import('tailwindcss').Config} */\nmodule.exports = ${JSON.stringify(config, null, 2)}\n`;
      downloadFile(content, "tailwind.colors.js", "text/plain");
      break;
    }
    case "markdown": {
      const lines = [
        "# Let Em Cook — Color Palette",
        "",
        "## Brand Colors",
        "",
        "| Name | CSS Variable | Hex | Group |",
        "|------|-------------|-----|-------|",
        ...brand.map(c => `| ${c.name} | \`${c.cssVar}\` | \`${c.hex}\` | ${c.group} |`),
        "",
        "## Category Colors",
        "",
        "| Category | Hex |",
        "|----------|-----|",
        ...cat.map(c => `| ${c.name} | \`${c.hex}\` |`),
      ];
      downloadFile(lines.join("\n"), "let-em-cook-colors.md", "text/markdown");
      break;
    }
  }
}

// ── Style guide markdown generator ────────────────────────────────────────

function generateStyleGuide(cssOverrides: Record<string, string>) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const lines: string[] = [
    "# Let Em Cook — Style Guide",
    `> Auto-generated ${date}`,
    "",
    "A living design system reference for the Let Em Cook cooking application.",
    "Covers design tokens, typography, spacing, and all UI components.",
    "",
    "---",
    "",
    "## Design Tokens",
    "",
    "### Brand Colors",
    "",
    "| Name | CSS Variable | Hex | Group |",
    "|------|-------------|-----|-------|",
    ...BRAND_COLORS.map(c => `| ${c.name} | \`${c.cssVar}\` | \`${c.hex}\` | ${c.group} |`),
    "",
    "### Category Colors",
    "",
    "| Category | Hex |",
    "|----------|-----|",
    ...CATEGORY_COLORS.map(c => `| ${c.name} | \`${c.hex}\` |`),
    "",
    "### Border Radius",
    "",
    "| Token | CSS Variable | Value |",
    "|-------|-------------|-------|",
    "| Small | `--radius-sm` | `0.5rem` |",
    "| Medium | `--radius-md` | `0.75rem` |",
    "| Large | `--radius-lg` | `1rem` |",
    "| XL | `--radius-xl` | `1.5rem` |",
    "| Full (pill) | `--radius-full` | `9999px` |",
    "",
    "### Typography",
    "",
    "Font: `Arial, Helvetica, sans-serif` · Base line-height: `1.5`",
    "",
    "| Scale | Size | Weight | Role |",
    "|-------|------|--------|------|",
    "| 4xl | `2rem` | 700 | Page hero headings |",
    "| 3xl | `1.5rem` | 700 | Section headings |",
    "| 2xl | `1.25rem` | 700 | Card headings |",
    "| xl | `1rem` | 700 | Sub-headings |",
    "| base | `1rem` | 400 | Body text · `#4a5568` |",
    "| sm | `0.875rem` | 400 | Secondary / captions · `#718096` |",
    "| xs | `0.6875rem` | 600 | Uppercase labels · tracked |",
    "",
    "---",
    "",
    "## Components",
    "",
  ];

  const byCategory: Record<string, StyleElement[]> = {};
  for (const el of ELEMENTS) {
    if (!byCategory[el.category]) byCategory[el.category] = [];
    byCategory[el.category].push(el);
  }

  for (const cat of CATEGORIES) {
    const els = byCategory[cat] ?? [];
    if (!els.length) continue;
    lines.push(`### ${cat}`, "");
    for (const el of els) {
      const css = cssOverrides[el.id] ?? el.css;
      const overrideNote = cssOverrides[el.id] ? " _(CSS customised)_" : "";
      lines.push(
        `#### ${el.name}${overrideNote}`,
        "",
        `> ${el.description}`,
        "",
        "**HTML**",
        "```html",
        el.html.trim(),
        "```",
        "",
        "**CSS**",
        "```css",
        css.trim(),
        "```",
        "",
        "---",
        "",
      );
    }
  }

  downloadFile(lines.join("\n"), "let-em-cook-style-guide.md", "text/markdown");
}

// ── PreviewCard ────────────────────────────────────────────────────────────

const PreviewCard = memo(function PreviewCard({
  element,
  onClick,
}: {
  element: StyleElement;
  onClick: () => void;
}) {
  const src = useMemo(
    () => buildSrcdoc(element.css, element.html, element.previewBodyStyle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element.id]
  );

  return (
    <div className={styles.previewCard} onClick={onClick}>
      <iframe
        className={styles.previewFrame}
        srcDoc={src}
        height={element.previewHeight ?? 160}
        sandbox="allow-same-origin"
        scrolling="no"
        title={element.name}
      />
      <div className={styles.previewFooter}>
        <span className={styles.previewName}>{element.name}</span>
        <span className={styles.previewCategory}>{element.category}</span>
      </div>
      <div className={styles.previewHoverLabel}>Open sandbox →</div>
    </div>
  );
});

// ── Page ───────────────────────────────────────────────────────────────────

export default function StyleGuidePage() {
  const [selected, setSelected] = useState<StyleElement | null>(null);
  const [editedCss, setEditedCss] = useState("");
  const [cssOverrides, setCssOverrides] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [copied, setCopied] = useState<"css" | "html" | null>(null);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const paletteMenuRef = useRef<HTMLDivElement>(null);

  // Initialise editor with any saved override when opening a new element
  useEffect(() => {
    if (selected) setEditedCss(cssOverrides[selected.id] ?? selected.css);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close palette menu on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (paletteMenuRef.current && !paletteMenuRef.current.contains(e.target as Node)) {
        setShowPaletteMenu(false);
      }
    }
    if (showPaletteMenu) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showPaletteMenu]);

  // Close sandbox on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSandbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, editedCss]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while sandbox is open
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const sandboxSrc = useMemo(
    () =>
      selected
        ? buildSrcdoc(editedCss, selected.html, selected.previewBodyStyle)
        : "",
    [editedCss, selected?.html, selected?.previewBodyStyle] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return ELEMENTS.filter((el) => {
      if (activeCategory !== "All" && el.category !== activeCategory) return false;
      if (!q) return true;
      return (
        el.name.toLowerCase().includes(q) ||
        el.description.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  function closeSandbox() {
    if (selected) {
      if (editedCss !== selected.css) {
        setCssOverrides(prev => ({ ...prev, [selected.id]: editedCss }));
      } else {
        setCssOverrides(prev => {
          const next = { ...prev };
          delete next[selected.id];
          return next;
        });
      }
    }
    setSelected(null);
  }

  async function copy(type: "css" | "html") {
    const text = type === "css" ? editedCss : selected?.html ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  }

  function handleExtractPalette(fmt: ColorFormat) {
    setShowPaletteMenu(false);
    generateColorPalette(fmt);
  }

  return (
    <div className={styles.page}>
      {/* ── Controls bar ───────────────────────────────────────────────── */}
      <div className={styles.controls}>
        <div className={styles.controlsTop}>
          <h1 className={styles.pageTitle}>🔪 Let Em Cook — Style Guide</h1>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search components…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.exportGroup}>
            <div className={styles.paletteMenuWrap} ref={paletteMenuRef}>
              <button
                className={styles.exportBtn}
                onClick={() => setShowPaletteMenu(v => !v)}
              >
                Extract Color Palette ▾
              </button>
              {showPaletteMenu && (
                <div className={styles.paletteMenu}>
                  {COLOR_FORMAT_LABELS.map(([fmt, label]) => (
                    <button
                      key={fmt}
                      className={styles.paletteMenuItem}
                      onClick={() => handleExtractPalette(fmt)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={`${styles.exportBtn} ${styles.exportBtnPrimary}`}
              onClick={() => generateStyleGuide(cssOverrides)}
            >
              Extract Style Guide
            </button>
          </div>
        </div>
        <div className={styles.controlsChips}>
          <button
            className={`${styles.chip} ${activeCategory === "All" ? styles.chipActive : ""}`}
            onClick={() => setActiveCategory("All")}
          >
            All ({ELEMENTS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = ELEMENTS.filter((el) => el.category === cat).length;
            return (
              <button
                key={cat}
                className={`${styles.chip} ${activeCategory === cat ? styles.chipActive : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Masonry grid ───────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((el) => (
            <PreviewCard
              key={el.id}
              element={el}
              onClick={() => setSelected(el)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptySearch}>
          <span className={styles.emptySearchIcon}>🥕</span>
          <p className={styles.emptySearchText}>No components match &ldquo;{search}&rdquo;</p>
          <p className={styles.emptySearchSub}>Try a different keyword or category filter.</p>
        </div>
      )}

      {/* ── Sandbox modal ──────────────────────────────────────────────── */}
      {selected && (
        <div
          className={styles.sandboxOverlay}
          onClick={closeSandbox}
        >
          <div
            className={styles.sandboxModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.sandboxHeader}>
              <div className={styles.sandboxHeaderInfo}>
                <span className={styles.sandboxCategory}>{selected.category}</span>
                <h2 className={styles.sandboxTitle}>{selected.name}</h2>
                <p className={styles.sandboxDesc}>{selected.description}</p>
              </div>
              <button
                className={styles.sandboxCloseBtn}
                onClick={closeSandbox}
                aria-label="Close sandbox"
              >
                ✕
              </button>
            </div>

            {/* Body: editor + preview */}
            <div className={styles.sandboxBody}>
              <div className={styles.sandboxLeft}>
                <div className={styles.sandboxPanelLabel}>
                  CSS — edit and see changes live
                </div>
                <div className={styles.editorWrap}>
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
                </div>
              </div>
              <div className={styles.sandboxRight}>
                <div className={styles.sandboxPanelLabel}>Preview — live</div>
                <iframe
                  className={styles.sandboxPreviewFrame}
                  srcDoc={sandboxSrc}
                  sandbox="allow-same-origin"
                  title="Live preview"
                />
              </div>
            </div>

            {/* Footer */}
            <div className={styles.sandboxFooter}>
              <code className={styles.htmlSnippet}>
                {selected.html.replace(/\n\s*/g, " ").slice(0, 120)}
                {selected.html.length > 120 ? "…" : ""}
              </code>
              <div className={styles.footerActions}>
                <button
                  className={`${styles.footerBtn} ${styles.footerBtnReset}`}
                  onClick={() => setEditedCss(selected.css)}
                >
                  Reset
                </button>
                <button
                  className={`${styles.footerBtn} ${
                    copied === "css" ? styles.footerBtnCopied : styles.footerBtnCss
                  }`}
                  onClick={() => copy("css")}
                >
                  {copied === "css" ? "Copied!" : "Copy CSS"}
                </button>
                <button
                  className={`${styles.footerBtn} ${
                    copied === "html" ? styles.footerBtnCopied : styles.footerBtnHtml
                  }`}
                  onClick={() => copy("html")}
                >
                  {copied === "html" ? "Copied!" : "Copy HTML"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
