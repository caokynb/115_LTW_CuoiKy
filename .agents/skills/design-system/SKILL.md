---
name: awesome-design-skills
description: "Design system tokens, UI component guidelines, accessibility standards (WCAG 2.2 AA), and aesthetic rules for web applications based on bergside/awesome-design-skills. Special focus on modern cinema/dark mode UI for CineHub."
category: frontend
risk: safe
source: https://github.com/bergside/awesome-design-skills
source_repo: bergside/awesome-design-skills
date_added: "2026-11-20"
tags: [design-system, ui, ux, tailwind, dark-mode, cinema, accessibility, wcag]
tools: [claude, codex, cursor, copilot, gemini]
license: MIT
---

# Awesome Design Skills · Cinema & Modern Web Design System

Derived from [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills), tailored for **CineHub** (Cinema Ticket Booking System - React + Tailwind CSS).

## 1. Visual Identity & Design Philosophy

- **Aesthetic Direction:** Cinema Modern / Dramatic Dark Mode.
  - Deep atmospheric dark backgrounds mimicking a movie theater environment.
  - High-contrast accents for focal actions (Booking, Seat Selection, Countdown alerts).
  - Clean, un-cluttered content surfaces avoiding generic gradients or excessive glassmorphism.
- **Theme Support:** Native Dark & Light modes controlled via Tailwind CSS classes (`dark:` modifier) synced with `ThemeContext`.

---

## 2. Style Foundations (Design Tokens)

### 2.1. Color Palette

| Token Role | Tailwind Class (Dark Mode) | Hex / Tailwind Value | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **Surface 0 (Canvas)** | `bg-slate-950` / `bg-neutral-950` | `#020617` / `#0a0a0a` | Main background of the theater portal |
| **Surface 1 (Card/Container)** | `bg-slate-900` / `bg-neutral-900` | `#0f172a` / `#171717` | Movie cards, modal containers, admin panels |
| **Surface 2 (Elevated/Hover)** | `bg-slate-800` | `#1e293b` | Form inputs, dropdown menus, table headers |
| **Border / Divider** | `border-slate-800` / `border-slate-700` | `#334155` | Subtle separation without visual clutter |
| **Brand Primary (Accent)** | `bg-rose-600` / `hover:bg-rose-700` | `#e11d48` | Primary CTA, Book ticket button, Active seats |
| **VIP Accent** | `bg-amber-500` / `text-amber-400` | `#f59e0b` | VIP seat indicator, special screenings, awards |
| **Success / Available** | `bg-emerald-600` / `text-emerald-400`| `#059669` | Available seats, payment confirmed status |
| **Warning / Hold** | `bg-amber-600` | `#d97706` | Countdown timer < 1 min, seat conflict warning |
| **Danger / Sold** | `bg-slate-700` / `bg-rose-500` | `#475569` | Sold seats (disabled), cancel reservation |
| **Text High-Contrast** | `text-slate-50` / `text-white` | `#f8fafc` | Headings, movie titles, price numbers |
| **Text Secondary** | `text-slate-400` | `#94a3b8` | Metadata (duration, genres, release dates) |

### 2.2. Typography Scale

- **Font Family:** `font-sans` (`Inter, system-ui, -apple-system, sans-serif`).
- **Headings:**
  - `Hero Title`: `text-4xl md:text-5xl font-extrabold tracking-tight`
  - `Section Title`: `text-2xl md:text-3xl font-bold tracking-tight text-white`
  - `Card Title`: `text-lg font-semibold line-clamp-1`
  - `Body / Metadata`: `text-sm text-slate-400`
  - `Price / Numeric`: `font-mono font-bold text-rose-500 text-lg`

### 2.3. Spacing & Touch Targets

- **Touch Target Standard:** All clickable buttons, seat icons, and pagination controls **MUST** have an interactive boundary of at least `44x44px` on mobile screens (`p-2.5` or `min-h-[44px] min-w-[44px]`).
- **Container Max-Width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.

---

## 3. Core Component Design Guidelines

### 3.1. Seat Matrix (`SeatMap`, `Seat`, `SeatRow`)
- **Curved Screen Indicator:**
  ```html
  <div class="w-full max-w-2xl mx-auto text-center mb-8">
    <div class="h-2 bg-gradient-to-r from-transparent via-rose-500 to-transparent rounded-full shadow-[0_4px_20px_rgba(225,29,72,0.6)]"></div>
    <span class="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-2 inline-block">Màn Hình / Screen</span>
  </div>
  ```
- **Seat States:**
  - `Standard Available`: `bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600`
  - `VIP Available`: `bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60`
  - `Selected`: `bg-rose-600 text-white font-bold ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900 scale-105`
  - `Occupied / Sold`: `bg-slate-800 text-slate-600 cursor-not-allowed opacity-50`
- **Accessibility:** Each seat MUST have `aria-label="Ghế [Row][Number], [Loại ghế], [Trạng thái]"` (e.g. `aria-label="Ghế C5, VIP, Đang chọn"`).

### 3.2. Movie Card (`MovieCard`)
- Poster aspect ratio locked at `aspect-[2/3]`.
- Rounded corners `rounded-xl overflow-hidden`.
- Poster hover effect: `group-hover:scale-105 transition-transform duration-300 ease-out`.
- Status pill badge on top corner (`Đang chiếu`: `bg-rose-600/90`, `Sắp chiếu`: `bg-blue-600/90`).

### 3.3. Countdown Timer Badge
- Sticky or fixed indicator in seat booking screen.
- Normal state (> 1 min): `bg-slate-800/90 text-slate-200 border border-slate-700`.
- Warning state (< 1 min): `bg-rose-950/90 text-rose-300 border border-rose-600 animate-pulse`.

---

## 4. Accessibility Rules (WCAG 2.2 AA Compliance)

1. **Color Contrast:**
   - Normal text (`< 18pt` or `< 14pt bold`): Minimum contrast ratio **4.5:1** against the background.
   - Large text (`>= 18pt` or `>= 14pt bold`): Minimum contrast ratio **3:1**.
   - NEVER use low-contrast grey (`text-slate-600` on `bg-slate-900`).
2. **Keyboard Navigation:**
   - All interactive controls (`button`, `a`, `input`, `select`) must have visible focus rings:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`.
3. **Screen Readers & Forms:**
   - Every input has a matching `<label htmlFor="...">`.
   - Error messages must link via `aria-describedby="[field]-error"` and use `aria-live="polite"`.

---

## 5. Do's & Don'ts (Anti-Patterns to Avoid)

| Do ✅ | Don't ❌ |
| :--- | :--- |
| Use clear, high-contrast dark tones (`slate-900`, `slate-950`). | Don't make everything translucent glassmorphism with unreadable text. |
| Provide loading skeletons with matched layout dimensions. | Don't show plain spinners that cause dramatic layout shift (CLS). |
| Show explicit error banners when seat conflict occurs (HTTP 409). | Don't fail silently or clear the user's entire selection without notice. |
| Use SVG icons (Heroicons/Lucide) with semantic aria attributes. | Don't use random unicode emojis as critical action icons. |
| Lock line lengths between 45-75 characters for synopsis readability. | Don't span paragraph text 100% full-width on ultra-wide desktop monitors. |
