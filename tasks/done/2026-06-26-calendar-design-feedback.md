# Calendar Design Feedback - May 2026 View

This document outlines an evaluation of the provided calendar design, highlighting issues and proposing solutions for a delegated team to implement.

## Design Description

The calendar presents a monthly view for May 2026. Key visual elements include:

*   **Header:** Displays "May 2026" with navigation arrows.
*   **Weekdays:** Standard "Mon" to "Sun" labels.
*   **Date Grid:** Each cell contains a day number and a small blue dot.
*   **Color Coding:** Multiple background and text color combinations are used:
    *   Dark Grey background, White text, Blue dot (standard weekdays).
    *   Light Pink background, Red text, Blue dot (specific dates like 1, 8, 15, 27).
    *   Light Green background, Green text, Blue dot (specific dates like 4, 10, 24).
    *   Light Yellow background, Brown/Orange text, Blue dot (date 30).
    *   White/Light Grey background, Light Grey text, Blue dot (weekends and out-of-month dates like 2, 3, 9, 16, 23, 30, 31).
*   **Out-of-Month Dates:** Dates from April (27-29) and June (30, 31) are visible.
*   **Footer:** Summarizes "Work days: 19 x 6h = 114.0h | Tracked: 18d 104.6h" and includes a "Details" link.

## Evaluation: Problems and Proposed Solutions

### 1. Problem: Excessive & Inconsistent Color Coding

*   **What's Wrong:** The calendar uses too many distinct color combinations without an accompanying legend, making it difficult for users to quickly understand the meaning of each state. Color choices for "holidays" or "special days" (pink vs. green vs. yellow) lack a consistent logical pattern. Many color combinations (e.g., red on light pink, green on light green, light grey on white) likely fail accessibility contrast standards.

    **Remaining unfixed (CSS audit):**
    *   `.cal-swapped` (`#fef3c7`) and `.cal-short` (`#fef9c3`) are nearly identical light yellows in light theme. In dark mode they use **exact same colors** (`#451a03` bg, `#fde68a` text) — zero visual distinction.
    *   `.cal-day` has **no background color** in light theme — regular workday cells are transparent/white with only a `1px solid #e9e9e9` border, making the grid look flat.
    *   `.cal-weekend` background (`#f7f7f7`) is barely distinguishable from the white page.
    *   `.cal-today` background (`#eff6ff`) too subtle — nearly invisible without the blue border ring.
    *   All category colors (holiday, vacation, memoriam, swapped, short) are hardcoded hex values, not theme-aware CSS variables.

*   **How to Fix:**
    *   **Simplify:** Reduce the number of distinct color states to a maximum of 3-4 (e.g., Current Month Workday, Current Month Non-Workday/Holiday, Out-of-Month Day, Today).
    *   **Standardize:** Assign a single, consistent color to all non-working days/holidays and a separate one for standard working days.
    *   **Distinguish swapped vs short:** Give `.cal-swapped` and `.cal-short` distinct color palettes in both themes (e.g., amber for swapped, yellow for short).
    *   **Add cell background:** Give `.cal-day` a light background (e.g., `white` or `#fafafa`) so the grid has visual structure.
    *   **Strengthen weekend mute:** Use a clearly muted background (e.g., `#f3f4f6` or `#e5e7eb`) instead of `#f7f7f7`.
    *   **Strengthen today marker:** Use a more visible background (e.g., `#dbeafe`) or increase the blue border weight.
    *   **Add a Legend:** Implement a clear visual legend (e.g., an 'i' icon for information or a persistent key) explaining each color's meaning (e.g., "Green = Holiday", "Pink = Short Work Day", "Yellow = Today").
    *   **High Contrast:** Adjust all color combinations to meet WCAG AA/AAA contrast ratios for readability and accessibility.

### 2. Problem: Unclear Out-of-Month Dates

*   **What's Wrong:** Dates from preceding and succeeding months (April 27-29, June 30-31) are presented with insufficient visual distinction, blending in too much with the current month's active days. This confuses the user about the actual boundaries of May 2026.

    **Remaining unfixed (CSS audit):**
    *   `.cal-day-other` uses `color: #d4d4d4` in light theme — this is **too light**, failing WCAG AA contrast on white (ratio ~1.5:1). The fix over-corrected: instead of de-emphasizing, it made text illegible.

*   **How to Fix:** Visually de-emphasize non-current month days more aggressively, while maintaining readability. Use a visible-but-faded text color (e.g., `#9ca3af` for ~3:1 contrast) and optionally a lighter background. Avoid sub-3:1 contrast ratios.

### 3. Problem: Ambiguous Blue Dot and Visual Hierarchy

*   **What's Wrong:** The small blue dot beneath each date has no defined meaning or purpose. Its subtlety means that if it's meant to convey important information (e.g., events, tracked activities), it's easily overlooked. If it's merely decorative, it adds visual clutter.

    **Remaining unfixed (CSS audit):**
    *   No legend exists anywhere in the UI explaining the dot.
    *   `.cal-has-sessions::before` blue dot (`#3b82f6`) may be invisible on colored cell backgrounds (holiday green, swapped amber, etc.) since the dot is only 5px and has no outline.

*   **How to Fix:**
    *   **Explain Purpose:** Clearly define what the blue dot signifies. Integrate this explanation into the calendar's design, perhaps through a tooltip on hover for each date or by adding its meaning to the legend.
    *   **Vary Prominence (If Critical):** If the dot indicates a critical item (e.g., an event), consider increasing its size, using a more noticeable icon, or changing its color based on importance. If a date can have multiple events, display an event count (e.g., "3 events") instead of a single dot.
    *   **Dot visibility on colored cells:** Add a white or dark outline/stroke to the session dot so it remains visible against any cell background color (holiday green, swapped amber, etc.).

---
**Next Steps for Delegate:**
1.  Implement the proposed fixes for color coding and accessibility.
2.  Refine the visual distinction for out-of-month dates.
3.  Clarify the purpose of the blue dot and update its visual representation if necessary.
4.  Add `.cal-day-header` contrast fix — `#8c8c8c` on white is too light for column headers (Mon-Sun labels). Use `#6b7280` or darker.
5.  Theme-ify all calendar color variables — replace hardcoded hex colors in `.cal-holiday`, `.cal-vacation`, `.cal-memoriam`, `.cal-swapped`, `.cal-short`, `.cal-information` with CSS custom properties so both themes get consistent, distinguishable palettes.
