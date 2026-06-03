"use client";

import { useState, useEffect, useMemo, memo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { css as cssLang } from "@codemirror/lang-css";
import { githubLight } from "@uiw/codemirror-theme-github";
import styles from "./styleGuide.module.css";
import {
  ELEMENTS,
  CATEGORIES,
  ROOT_CSS,
  SHARED_CSS,
  StyleElement,
  Category,
} from "./data/elements";

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

export default function StyleGuidePage() {
  const [selected, setSelected] = useState<StyleElement | null>(null);
  const [editedCss, setEditedCss] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [copied, setCopied] = useState<"css" | "html" | null>(null);

  // Reset CSS editor when a new element is selected
  useEffect(() => {
    if (selected) setEditedCss(selected.css);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sandbox on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  async function copy(type: "css" | "html") {
    const text = type === "css" ? editedCss : selected?.html ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className={styles.page}>
      {/* ── Controls bar ─────────────────────────────────────────────────── */}
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

      {/* ── Masonry grid ─────────────────────────────────────────────────── */}
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

      {/* ── Sandbox modal ────────────────────────────────────────────────── */}
      {selected && (
        <div
          className={styles.sandboxOverlay}
          onClick={() => setSelected(null)}
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
                onClick={() => setSelected(null)}
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
