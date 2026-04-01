# Design System Specification: Atmospheric Depth & Editorial Clarity

## 1. Overview & Creative North Star: "The Celestial Curator"
This design system moves away from the utilitarian "grid of boxes" common in weather utilities. Our North Star is **The Celestial Curator**: an experience that feels like looking through a high-end telescope lens—layered, precise, and immersive. 

We break the "template" look by using **intentional asymmetry** (e.g., placing a massive temperature display off-center) and **high-contrast typography scales** that prioritize data storytelling over simple data delivery. The UI is not a flat plane; it is a pressurized environment of frosted glass sheets floating in a deep, tonal vacuum.

---

## 2. Color & Surface Philosophy
The palette is rooted in a deep-space midnight, contrasted with "Liquid Gold" and "Glacial Blue" accents.

### The "No-Line" Rule
Explicitly prohibit 1px solid borders for sectioning or grouping. Layout boundaries must be defined solely through background color shifts or the "Glass & Gradient" technique. 
*   **Application:** Use `surface_container_low` for the main content area and `surface_container_high` for individual interactive modules.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack. Each layer moves closer to the user:
1.  **Base Layer:** `surface` (#0e1322) - The vast background.
2.  **Sectional Layer:** `surface_container` (#1a1f2f) - Large groupings of data.
3.  **Active Card Layer:** Glassmorphism (see below) - Floating, high-priority insights.

### The Glass & Gradient Rule
To achieve a premium "frosted" feel, floating elements use a semi-transparent fill:
*   **Fill:** `rgba(255, 255, 255, 0.08)`
*   **Backdrop Blur:** 20px to 32px.
*   **The Signature CTA:** Use a linear gradient for primary buttons, transitioning from `primary_container` (#ffc107) to `primary` (#ffe4af). This "glow" provides a tactile, professional polish.

---

## 3. Typography: Editorial Authority
We use **Plus Jakarta Sans** for its geometric clarity and modern warmth. The hierarchy is driven by extreme scale variance.

*   **Display-LG (Hero Temp):** 72pt / 3.5rem. Bold weight. This is the anchor of the screen.
*   **Headline-MD (Condition):** 1.75rem. Medium weight. Used for the primary weather state (e.g., "Thunderstorms").
*   **Body-LG (Insights):** 1rem. Regular weight. Used for the "human" weather summary (e.g., "Carry an umbrella until 4 PM").
*   **Label-SM (Metadata):** 0.6875rem. Bold/All-caps. Used for technical data points like "UV INDEX" or "DEW POINT."

**The Contrast Rule:** Always pair a `display-lg` element with a `label-sm` nearby to create a sophisticated, editorial rhythm.

---

## 4. Elevation & Depth
Depth is a functional tool, not a decoration.

### Tonal Layering
Place a `surface_container_lowest` (#090e1c) card onto a `surface_container_low` (#161b2b) section to create a "recessed" well. This communicates that the content is supplementary.

### Ambient Shadows
For floating glass cards, use an extra-diffused shadow:
*   **Shadow:** `0px 24px 48px rgba(0, 0, 0, 0.4)`
*   **The Shadow Tint:** Shadows should not be neutral grey. Mix 5% of the `primary` color into the shadow value to mimic the light refraction of the gold accents.

### The "Ghost Border" Fallback
If a visual edge is required for accessibility, use the **Ghost Border**:
*   **Stroke:** 1.5px.
*   **Color:** `outline_variant` at 15% opacity.
*   **Requirement:** Never use 100% opaque borders for interior containers.

---

## 5. Components

### The Weather Glass Card
The core unit of the app. 
*   **Shape:** 24px (`md`) corner radius.
*   **Background:** Glass Fill with 24px backdrop blur.
*   **Content:** No dividers. Use **Spacing 8** (2.75rem) to separate the "Metric" from the "Trend Line."

### Pill Navigation
A floating, docked bar at the bottom.
*   **Shape:** `full` (9999px).
*   **Style:** Glassmorphism with a subtle `outline_variant` Ghost Border.
*   **Active State:** The active icon glows with a `primary_fixed` shadow.

### Data Chips
For hourly forecasts or wind speeds.
*   **Shape:** `sm` (0.5rem).
*   **Color:** `surface_container_highest` for inactive, `primary_container` for active.

### Input Fields
*   **Style:** Underline only, using `outline` token.
*   **Focus State:** The underline expands to 2px and shifts to `primary`.

### Interaction Pattern: 3D Stagger
Cards should not just "appear." On entry, cards must use a **staggered 3D entrance**:
1.  **Scale:** Start at 0.95x.
2.  **Rotation:** 5-degree X-axis tilt.
3.  **Opacity:** Fade from 0 to 1 over 400ms.
4.  **Parallax:** As the user scrolls, background atmospheric elements (clouds/sun) move at 20% the speed of the foreground glass cards.

---

## 6. Do's and Don'ts

### Do
*   **DO** use white space as your primary divider. If a section feels cluttered, increase the spacing to `spacing-10` (3.5rem) before adding a line.
*   **DO** use `secondary` (#a4c9ff) for all data-heavy visualizations (bar charts, precipitation lines) to keep them distinct from the `primary` gold branding.
*   **DO** ensure the Hero Temp (`display-lg`) has enough breathing room to feel like an art piece.

### Don't
*   **DON'T** use standard Material Design drop shadows. They are too "heavy" for a glass-based system.
*   **DON'T** use pure white (#FFFFFF) for text. Use `on_surface` (#dee1f7) to maintain the cinematic, low-glare dark mode aesthetic.
*   **DON'T** use sharp corners. Everything must feel smoothed and eroded by wind—stick strictly to the 24px `md` radius or `full` pills.