---
name: Next Play Games - Kanban
description: Clean, warm alabaster light-mode design system with crisp white surfaces and vibrant indigo accents for game sprint workflows
colors:
  primary: "#6366f1"
  primary-hover: "#4f46e5"
  alabaster-canvas: "#f8fafc"
  sidebar-surface: "#f1f5f9"
  card-surface: "#ffffff"
  border-subtle: "#e2e8f0"
  border-hover: "#cbd5e1"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#64748b"
  signal-amber: "#d97706"
  emerald-pulse: "#059669"
  crimson-alert: "#e11d48"
  indigo-tag-bg: "#eef2ff"
  indigo-tag-text: "#4338ca"
  indigo-tag-border: "#c7d2fe"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.05em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  badge-count:
    backgroundColor: "{colors.sidebar-surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-tag:
    backgroundColor: "{colors.indigo-tag-bg}"
    textColor: "{colors.indigo-tag-text}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  status-pill:
    backgroundColor: "#ecfdf5"
    textColor: "{colors.emerald-pulse}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Next Play Games - Kanban

## Overview

**Creative North Star: "Linear Studio Alabaster"**

Next Play Games - Kanban uses a warm, high-clarity light theme engineered for daytime production sprints and multi-view project execution. It marries a warm alabaster canvas (`#f8fafc`) with crisp white card surfaces (`#ffffff`), subtle cool slate structural dividers (`#e2e8f0`), and vibrant indigo accents (`#6366f1`).

The system emphasizes tactile legibility and restraint. Color is applied purposefully as telemetry: status top borders on columns, high-contrast taxonomy chips, and clear priority badges. Surfaces remain clean, planar, and free from visual noise or heavy blur effects that could degrade interaction responsiveness.

**Key Characteristics:**
- **Warm Alabaster Canvas:** Soft `#f8fafc` backdrop prevents harsh glare while providing crisp optical contrast against pure white cards.
- **Pure White Cards with Subtle Depth:** Cards stand out via hairline `#e2e8f0` borders and soft ambient elevation (`shadow-sm` transitioning to `shadow-md` on hover).
- **Vibrant Indigo Signature:** Electric Indigo (`#6366f1`) drives primary actions, active navigation states, and focus rings.
- **Status-Coded Top Accent Borders:** Kanban columns feature 2px status headers (Slate, Indigo, Amber, Emerald) for instant peripheral orientation.

## Colors

The palette pairs warm neutrals with saturated telemetry signals optimized for light mode contrast and accessibility.

### Primary
- **Vibrant Indigo** (`#6366f1`): Primary action buttons, active navigation views, focus indicators, and the "In Progress" workflow indicator.

### Secondary
- **Emerald Pulse** (`#059669`): "Done" column state, guest session active status, and successful milestone markers.
- **Signal Amber** (`#d97706`): "In Review" column indicator and caution warnings.
- **Crimson Alert** (`#e11d48`): High-priority urgent flags, critical bug chips, and overdue due dates.

### Neutral
- **Alabaster Canvas** (`#f8fafc`): Base application canvas and background viewport.
- **Sidebar Surface** (`#f1f5f9`): Navigation sidebar and secondary grouping container.
- **Card Surface** (`#ffffff`): Pure white task cards, modal dialogs, and drawer panels.
- **Subtle Border** (`#e2e8f0`): Architectural grid dividing lines, column borders, and card outlines.
- **Hover Border** (`#cbd5e1`): Interactive card hover and input focus states.
- **Primary Text** (`#0f172a`): High-contrast titles, board headers, and primary card labels.
- **Secondary Text** (`#475569`): Subheadings, descriptions, and counter pill numbers.
- **Muted Text** (`#64748b`): Placeholders, empty column indicators, and timestamps.

### Named Rules
**The Clean Container Rule.** Column pods and scroll containers use clean background colors (`#ffffff` / `#f8fafc`) without backdrop-blur filters or transform properties, ensuring drag-and-drop coordinate math stays locked to the pointer.

**The Telemetry Luminescence Rule.** High-chroma colors (`#6366f1`, `#059669`, `#d97706`, `#e11d48`) are reserved for operational telemetry (status borders, tag chips, priority badges) and never applied as solid backgrounds across full cards.

## Typography

**Display Font:** Inter (with `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`)  
**Body Font:** Inter (with `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`)  
**Label/Mono Font:** Inter (with `ui-sans-serif, system-ui, sans-serif`)

**Character:** Clean, legible neo-grotesque sans-serif with tight tracking on headings and generous open counters on small-size metadata chips.

### Hierarchy
- **Display** (Bold 700, 24px / `1.5rem`, line-height 1.2, letter-spacing `-0.025em`): Board title in header.
- **Headline** (SemiBold 600, 14px / `0.875rem`, line-height 1.25, letter-spacing `0.05em`, uppercase): Column titles ("TO DO", "IN PROGRESS", "IN REVIEW", "DONE").
- **Title** (Medium 500, 14px / `0.875rem`, line-height 1.25): Task card titles and milestone names.
- **Body** (Regular 400, 12px / `0.75rem`, line-height 1.4, max 2-line clamp): Task card descriptions and table cells.
- **Label** (Bold 700, 10px / `0.625rem`, letter-spacing `0.05em`, uppercase): Priority badges (`HIGH`, `NORMAL`, `LOW`) and taxonomy tags (`Bug`, `Feature`, `Design`).

### Named Rules
**The Micro-Metadata Rule.** Card priority badges and taxonomy tags are set in compact uppercase tracking (`10px`, bold, `0.05em`) to maximize scanability without competing with task titles.

## Layout

The application employs a desktop-first two-pane shell:
- **Left Navigation Sidebar:** 256px (`w-64`) fixed sidebar containing the workspace switcher, views navigator, active sprint progress, and studio roster.
- **Main Viewport Container:** Fluid flex viewport (`bg-slate-50`) hosting the sticky app bar, telemetry KPI strip, and active view body.
- **Kanban Grid:** 4-column responsive grid on desktop (`grid grid-cols-1 md:grid-cols-4 gap-6`), collapsing to a single fluid column on small viewports.
- **Task List View:** Grouped Asana/Linear style table divided by workflow stage.
- **Milestones View:** Multi-card studio release roadmap with progress trackers.

## Elevation & Depth

Next Play Games - Kanban uses **Tonal Layering with Soft Shadows**:
1. Base Canvas: `#f8fafc` (Level 0)
2. Column Pod: `#ffffff` with 1px border `#e2e8f0` (Level 1)
3. Task Card: `#ffffff` with 1px border `#e2e8f0` and `shadow-sm` (Level 2)

### Shadow Vocabulary
- **Card Resting State** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Crisp resting elevation.
- **Card Hover State** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07)`): Subtle lift with `-translate-y-0.5`.
- **Drag Lift Elevation** (`box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.15)`): Spatial detachment during card drag transitions.

## Shapes

- **Column Pods & Containers:** Rounded rectangle (12px / `rounded-xl`).
- **Task Cards & Table Rows:** Rounded rectangle (8px / `rounded-lg`).
- **Label Chips:** Micro-radius (4px / `rounded`).
- **Status Pills & Counters:** Pill silhouette (9999px / `rounded-full`).

## Components

### Task Cards
- **Character:** Crisp white card displaying task scope, stage taxonomy, and priority badge.
- **Corner Style:** Rounded rectangle (8px / `rounded-lg`).
- **Background:** White (`#ffffff`), shifts to `#f8fafc` on hover.
- **Border:** 1px solid `#e2e8f0`; shifts to `#cbd5e1` on hover.
- **Internal Padding:** 16px (`p-4`).

### Column Containers
- **Character:** Dedicated status runway with status accent line.
- **Corner Style:** Rounded rectangle (12px / `rounded-xl`).
- **Background:** Pure White (`#ffffff`).
- **Border:** 1px solid `#e2e8f0` with 2px top status accent (`border-t-2`).

### Label Chips
- **Bug:** `bg-rose-50 text-rose-700 border-rose-200`
- **Feature:** `bg-indigo-50 text-indigo-700 border-indigo-200`
- **Design:** `bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200`
- **Backend:** `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Polish:** `bg-amber-50 text-amber-700 border-amber-200`

## Do's and Don'ts

### Do:
- **Do** maintain high text contrast on light surfaces (Slate 900 for titles, Slate 600 for body).
- **Do** keep ancestor wrappers of DragDropContext free from `backdrop-blur-*` and `transform` properties.
- **Do** preserve 2px status top accent borders on Kanban columns.
- **Do** use uppercase 10px tracking for priority flags and taxonomy labels.

### Don't:
- **Don't** add backdrop-blur filters to the main content container or Kanban column wrappers.
- **Don't** use low-contrast grey-on-white text that fails accessibility guidelines.
- **Don't** apply heavy dark shadow rings on resting cards; keep shadows soft and clean.
