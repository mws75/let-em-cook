# Feat — Daily Macro Tracker · iOS Implementation Spec

**Status:** Spec — companion to `Feat - Daily Macro Tracker.md`
**Audience:** iOS developer building feature parity in the Let 'Em Cook iOS app
**Last updated:** 2026-04-30

> Read [`Feat - Daily Macro Tracker.md`](./Feat%20-%20Daily%20Macro%20Tracker.md) first. That doc is the source of truth for product intent, data shape, UX rules, and decisions. **This document is the iOS-specific contract** — API consumption, screen specs, navigation, local caching, offline behavior, and date/timezone rules.

---

## 1. What we're building on iOS

A native day-centric macro tracker with feature parity to the web `/dashboard/tracker` route. Same API, same data shape, same UX principles — but rebuilt as a native experience, not a web wrapper.

**Speed targets (must hit):**
- Cold launch → today's log visible: **< 1.0s** (with cached state).
- Logging a recent meal: **≤ 2 taps** from the day view.
- Day-to-day swipe navigation: **< 50ms** perceived latency (cache neighboring days).
- Quick Log modal open → entry committed: **< 5s** for the average path.

**Platforms:**
- iOS 17+ (matches the web's modern baseline).
- iPhone primary, iPad supported but secondary.
- SwiftUI for new screens. UIKit interop only if a SwiftUI primitive is missing.

---

## 2. Data contract — types & API

### 2.1 Swift type definitions

These mirror the TypeScript types in `src/types/types.ts` exactly. Keep field names in `snake_case` to match the JSON wire format — use `CodingKeys` only if you really need to convert to `camelCase` for downstream code.

```swift
public enum DailySlot: String, Codable, CaseIterable, Hashable {
    case breakfast, lunch, dinner, snack
}

public enum EntryKind: String, Codable {
    case recipe, manual
}

public struct DailyLogEntry: Codable, Identifiable, Hashable {
    public let id: String                // UUID v4 string from server or generated client-side
    public var slot: DailySlot
    public var kind: EntryKind
    public var recipeId: Int?            // present iff kind == .recipe
    public var name: String
    public var servings: Double
    public var calories: Double?
    public var proteinG: Double?
    public var fatG: Double?
    public var carbsG: Double?
    public var sugarG: Double?
    public var loggedAt: Date            // ISO 8601 on the wire

    enum CodingKeys: String, CodingKey {
        case id, slot, kind, name, servings
        case recipeId = "recipe_id"
        case calories
        case proteinG = "protein_g"
        case fatG = "fat_g"
        case carbsG = "carbs_g"
        case sugarG = "sugar_g"
        case loggedAt = "logged_at"
    }
}

public struct DailyLog: Codable, Hashable {
    public let logDate: String           // "yyyy-MM-dd" — see §6 for why a string
    public var entries: [DailyLogEntry]
    public var notes: String?

    enum CodingKeys: String, CodingKey {
        case logDate = "log_date"
        case entries, notes
    }
}

public struct MacroGoals: Codable, Hashable {
    public var calories: Int?
    public var proteinG: Int?
    public var fatG: Int?
    public var carbsG: Int?

    enum CodingKeys: String, CodingKey {
        case calories
        case proteinG = "protein_g"
        case fatG = "fat_g"
        case carbsG = "carbs_g"
    }
}
```

### 2.2 API endpoints (consumed by iOS)

Base URL: same host as the web app. Auth: Clerk session token in `Authorization: Bearer <token>` (use whatever auth mechanism the existing iOS app already wires up — do not invent a new one).

| Method | Path | Request | Response | Used for |
|---|---|---|---|---|
| `GET` | `/api/daily-log?date=YYYY-MM-DD` | — | `{ "log": DailyLog \| null }` | Single day fetch |
| `GET` | `/api/daily-log/range?start=YYYY-MM-DD&end=YYYY-MM-DD` | — | `{ "logs": DailyLog[] }` | Week strip dots, recents, history |
| `PUT` | `/api/daily-log` | `{ "date": string, "entries": [...], "notes"?: string }` | `{ "success": true }` | Upsert a day |
| `DELETE` | `/api/daily-log?date=YYYY-MM-DD` | — | `{ "success": true }` | Clear a day |
| `GET` | `/api/user/goals` | — | `{ "goals": MacroGoals }` | Goals card |
| `PUT` | `/api/user/goals` | `MacroGoals` | `{ "success": true }` | Update goals |

All errors come back as `{ "error": string }` with an HTTP 4xx/5xx. Treat non-2xx as a failure and show inline error UI; never silently swallow.

### 2.3 Recommended client architecture

```
TrackerView (SwiftUI screen)
  ├─ TrackerViewModel  (@Observable, @MainActor)
  │     ├─ TrackerRepository
  │     │     ├─ DailyLogAPI  (URLSession-based, async/await)
  │     │     └─ DailyLogCache (SwiftData or actor-wrapped dictionary, see §5)
  │     └─ derived state: totalsForCurrentDay, weekStripDots, recents
  └─ child views: WeekStrip, MacroGoalsCard, MealSlotSection, QuickAddSheet
```

The repository is the only thing that talks to the network. ViewModels never call `URLSession` directly. Lets us unit-test the VM with a mock repo and swap caching strategies later.

---

## 3. Screens

### 3.1 Navigation

- Add a tab to the root `TabView` titled **Tracker** (system symbol: `chart.bar.doc.horizontal`).
- Inside the tab: `NavigationStack` rooted at `TrackerView`.
- From `TrackerView`:
  - **Goals** button (top-right toolbar) → pushes `GoalsView`.
  - **Quick Add** (FAB or per-slot button) → presents `QuickAddSheet` as a sheet (`.presentationDetents([.medium, .large])`).
  - **Day picker** → opens an inline `DatePicker` in a sheet (`.presentationDetents([.height(320)])`) for jumping further than the visible week.

### 3.2 `TrackerView` — main day view

Top-down layout:

1. **WeekStrip** — horizontal, 7 buttons, mirrors the web spec. Active day filled with the brand primary, inactive days are plain text. Below each day, a 6pt circle: filled if any entries exist, empty otherwise.
2. **TotalsCard** — today's calories, P/F/C numbers, "X cal remaining" subtitle.
3. **MacroGoalsCard** — four progress rows (Calories, Protein, Fat, Carbs). Each: label, `current / goal`, horizontal progress bar. Over-goal turns the bar amber, never red.
4. **Bulk actions row** — `[+ Quick Add]` `[Copy yesterday]` `[Import from meal plan]`. Pill buttons.
5. **Slot sections** — Breakfast / Lunch / Dinner / Snacks, in that order. Each shows its slot total in the header, then a list of entries (swipe-to-delete, tap to edit), then `+ Add to {slot}`.

Pull-to-refresh on the scroll view triggers a fresh range fetch.

#### SwiftUI sketch

```swift
struct TrackerView: View {
    @State private var vm = TrackerViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                WeekStrip(
                    days: vm.weekDays,
                    selected: vm.selectedDate,
                    daysWithEntries: vm.weekStripDots,
                    onSelect: vm.selectDay
                )
                .padding(.horizontal)

                TotalsCard(totals: vm.todaysTotals,
                           remaining: vm.remainingCalories)
                    .padding(.horizontal)

                MacroGoalsCard(goals: vm.goals, totals: vm.todaysTotals)
                    .padding(.horizontal)

                BulkActionsRow(
                    onQuickAdd: { vm.presentQuickAdd(slot: nil) },
                    onCopyYesterday: vm.copyYesterday,
                    onImportFromPlan: vm.importFromMealPlan
                )
                .padding(.horizontal)

                ForEach(DailySlot.allCases, id: \.self) { slot in
                    MealSlotSection(
                        slot: slot,
                        entries: vm.entries(for: slot),
                        onAdd: { vm.presentQuickAdd(slot: slot) },
                        onDelete: { vm.delete($0) },
                        onEdit:   { vm.beginEdit($0) }
                    )
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Tracker")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink("Goals") { GoalsView(vm: vm.goalsVM) }
            }
        }
        .sheet(item: $vm.quickAddContext) { ctx in
            QuickAddSheet(context: ctx, recents: vm.recents,
                          recipes: vm.recipes, onSubmit: vm.commitEntry)
                .presentationDetents([.medium, .large])
        }
        .refreshable { await vm.refresh() }
        .task { await vm.load() }
    }
}
```

### 3.3 WeekStrip

Visually identical to the web (see §4.2 of the parent doc):

- Day-of-week label in caps (`MON`, `TUE`, …).
- Date in `MM/dd` format, tabular figures.
- 6pt dot below: filled `Color.accentColor` if logged, `Color.secondary.opacity(0.3)` otherwise.
- Swipe horizontally on the strip to advance ±7 days. Use a `TabView` with `.tabViewStyle(.page(indexDisplayMode: .never))` for the swipe, or build it with `ScrollView(.horizontal)` + paging.
- Long-press a day → open the date picker sheet.
- Haptic `.selectionChanged()` on day switch.

### 3.4 QuickAddSheet — the speed-critical screen

Three tabs, in this order — **Recents first**:

1. **Recents** — flat list of the user's last 10–15 distinct entries (computed server-side from a 14-day range fetch; see §4). Each row: emoji + name + macro summary. Tapping the row creates an entry for the current slot and dismisses the sheet. **One tap = logged.**
2. **Recipes** — search field + scrollable list of the user's recipes. Selecting one fills the macro fields below.
3. **Manual** — name + macro fields (calories / protein / fat / carbs / sugar).

Across all three tabs, persistent at the bottom:
- **Slot picker** — segmented control (`Picker` with `.segmented` style): Breakfast / Lunch / Dinner / Snack. Pre-selected from the slot the user came in from.
- **Servings stepper** — `Stepper(value: $servings, in: 0.25...10, step: 0.25)`. Displayed numerically (`× 1.0`, `× 1.5`).
- **Add button** — disabled until name is non-empty.

When in the Recipes tab and a recipe is selected, the macro fields auto-populate **post-multiplied by servings**. Editing a field after that decouples it from the recipe (we still keep `recipe_id` so the entry tracks back to the source, but the macros are user-authoritative once edited).

### 3.5 GoalsView

Four numeric fields (calories, P/F/C). Above them, a small explainer card:

> Not sure what to set? We recommend using a calculator like the **Mayo Clinic** or **Precision Nutrition** macro calculator. Tap below to open one — your numbers go in here.

Two `Link` buttons that open the calculators in Safari. Save button calls `PUT /api/user/goals`.

---

## 4. Recents — how the list is built

The web doc says "server-derived from a 14-day range fetch." Concrete iOS recipe:

1. On Tracker open, fire `GET /api/daily-log/range?start=<today-13d>&end=<today>`.
2. From the returned `DailyLog[]`, flatten all `entries`, sort by `loggedAt` descending.
3. Deduplicate by **`recipe_id` if present, else lowercased trimmed `name`**.
4. Take the top 15.
5. Cache for the session; refresh on pull-to-refresh.

No new API endpoint needed. Same logic used on web — keep the algorithm identical.

---

## 5. Local caching & offline

**Approach:** in-memory cache for the active session, plus a small persistent store for last-seen state.

- **In-memory:** an actor or `@Observable` repository that holds `[String: DailyLog]` keyed by `yyyy-MM-dd`. Populated on day fetches. Lookup is O(1).
- **Persistent (SwiftData or simple JSON-on-disk):** snapshot the last fetched 14-day window plus current goals to disk on app background. Restore on cold launch so the Tracker tab paints instantly with last-known state, then fires a background refresh.
- **Offline writes:** if a `PUT` fails because the device is offline, queue the change in a local "outbox" array (persisted) and retry when network returns. **Surface this state to the user** — a small banner: "Saving offline · will sync when online." Don't fail silently.
- **Conflict resolution:** last-writer-wins is fine for v1. Days are independent and edits are rare enough that real conflicts are unlikely. Document this assumption in the repo.

---

## 6. Date & timezone handling — read carefully

This is the easiest place to ship a bug. Rules:

1. **`log_date` is a wall-clock date string** in the user's local timezone, formatted `yyyy-MM-dd`. It is **not** a UTC instant. We deliberately do not convert it.
2. Use a single `DateFormatter`/`Calendar` configured to `Calendar.current` (user's local zone) for all "what day is it" decisions.
3. `loggedAt` on entries **is** a UTC ISO 8601 instant. Render it in the user's timezone for display, but never use it to decide which day a log belongs to.
4. **Never** use `Date()` and `dateFormat = "yyyy-MM-dd"` with a UTC formatter — that's how you get "today" off-by-one near midnight.
5. Centralize this in a `DayKey` value type:

```swift
public struct DayKey: Hashable, Codable, CustomStringConvertible {
    public let value: String  // "yyyy-MM-dd"

    public static func today(in calendar: Calendar = .current) -> DayKey {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return DayKey(value: formatter.string(from: Date()))
    }

    public func adding(days: Int, in calendar: Calendar = .current) -> DayKey {
        // … parse value, add days via calendar.date(byAdding:), reformat
    }

    public var description: String { value }
}
```

Use `DayKey` everywhere a date is involved. Don't pass `Date` for "which day" — that conflates instant with day.

---

## 7. Interactions & polish

These are the small details that separate a good iOS feature from a great one.

- **Haptics:** `.selectionChanged()` on day switch; `.success` on entry committed; `.warning` if a save fails.
- **Swipe-to-delete on entries:** standard iOS pattern. Confirm with `Alert` only if the entry is older than today (to prevent fat-finger deletion of historical data).
- **Drag-to-reorder within a slot:** nice-to-have; defer to v1.1.
- **Empty states:** when a slot has zero entries, render the `+ Add to {slot}` button as the only row. Don't show "No items" — the affordance to add is the empty state.
- **Keyboard:** in QuickAdd, the macro fields should use `.keyboardType(.decimalPad)`. Tap "Done" on the toolbar to dismiss.
- **Dark mode:** support from day one. All colors via the asset catalog or `Color(.label)`/`Color(.secondaryLabel)`.
- **Dynamic Type:** supported. Macro numbers use `.font(.title3.monospacedDigit())` so they don't dance during animation.
- **Accessibility:**
  - WeekStrip days have `accessibilityLabel("Thursday April 30, 1 entry logged")`.
  - Progress bars expose `accessibilityValue("64 percent of goal")`.
  - Sheet titles are real `Text` so VoiceOver reads them on present.

---

## 8. Build order (iOS-specific)

Mirrors the web build order from the parent doc, but adjusted for iOS sequencing:

1. **Add Swift types** in §2.1 to the shared model module (or new `Tracker` module).
2. **API client** — `DailyLogAPI` and `UserGoalsAPI`, async/await, returns `Decodable` types.
3. **Repository + cache** — `TrackerRepository`, in-memory dict, SwiftData/JSON persistence, outbox for offline writes.
4. **`DayKey` value type and date helpers.** Ship with unit tests covering DST and timezone rollover.
5. **`TrackerViewModel`** — pure state machine, fully testable without UI.
6. **`TrackerView` + `WeekStrip` + `TotalsCard` + `MacroGoalsCard`** — the read path, no editing yet.
7. **`MealSlotSection`** with delete (no add yet) — proves write/refresh cycle.
8. **`QuickAddSheet`** with Manual tab only.
9. **Add Recents tab** wired to range fetch.
10. **Add Recipes tab** — needs the existing recipes API client (already in the iOS app — reuse it).
11. **`GoalsView`** with calculator links.
12. **Bulk actions** — Copy yesterday, Import from meal plan, Clear day.
13. **Offline outbox + banner.**
14. **Accessibility / Dynamic Type / Dark Mode QA pass.**
15. **Performance pass:** cold launch < 1.0s with cached state, day swipe < 50ms.

---

## 9. Testing

- **Unit:** `DayKey` arithmetic across DST; macro summing; recents dedup; outbox retry logic.
- **Snapshot:** WeekStrip in light/dark, with and without dots; MacroGoalsCard at 0%, 50%, 100%, 120% of goal.
- **Integration:** Repository round-trip against a mock API; offline outbox replays correctly.
- **Manual / device:** test on a real iPhone the day before/after DST; test with a 24h-format locale; test with a long recipe name.

---

## 10. Out of scope for v1

These are tempting but explicitly **not in v1** so the iOS dev doesn't go down a rabbit hole:

- Apple HealthKit integration (read calories/macros from / write to Health). Earmark for v1.1.
- Barcode scanning. Earmark for v2.
- Photo-based food recognition. Earmark for v2.
- Watch app / Live Activities. Earmark for v1.1.
- Widgets (today on home screen). Earmark for v1.1 — high impact, do it second.
- Per-day goal overrides.
- Reminders / push notifications to "log your dinner."

---

## 11. Reference

- Parent doc: [`Feat - Daily Macro Tracker.md`](./Feat%20-%20Daily%20Macro%20Tracker.md)
- API source-of-truth: `src/app/api/daily-log/route.ts` (web app)
- Type source-of-truth: `src/types/types.ts` (web app — Swift types must stay in sync)
- DB schema: `src/db/schema.sql` and `migrations/002_daily_logs.sql`
