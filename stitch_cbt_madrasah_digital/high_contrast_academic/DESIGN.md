---
name: High-Contrast Academic
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c6c9ab'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#909378'
  outline-variant: '#464932'
  surface-tint: '#bad200'
  primary: '#ffffff'
  on-primary: '#2d3400'
  primary-container: '#d4f000'
  on-primary-container: '#5e6b00'
  inverse-primary: '#586400'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#17343b'
  tertiary-container: '#c9e8f1'
  on-tertiary-container: '#4c6971'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d4f000'
  primary-fixed-dim: '#bad200'
  on-primary-fixed: '#191e00'
  on-primary-fixed-variant: '#424b00'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#c9e8f1'
  tertiary-fixed-dim: '#adccd4'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#2e4b52'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-timer:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1200px
  gutter: 24px
  margin-mobile: 16px
  padding-card: 32px
---

## Brand & Style

The design system is engineered for high-stakes focus and academic rigor. It leverages a **High-Contrast / Modern** aesthetic that strips away visual noise to prioritize information density and clarity. By pairing a high-visibility neon yellow with deep charcoal tones, the interface creates an energetic yet professional environment suitable for intensive examination.

The emotional response is one of **urgent precision**. It should feel like a professional tool—reliable, fast, and uncompromising. The style avoids soft gradients or decorative flourishes in favor of sharp lines, intentional color blocks, and functional typography that minimizes cognitive load during long testing sessions.

## Colors

The palette is anchored by a "Neon Stabilo" primary color, used exclusively for primary actions, active states, and critical highlights. 

- **Primary (Neon Yellow):** High-visibility; used for the "Finish Exam" button, active question numbers, and progress indicators.
- **Neutral (Deep Charcoal/Black):** Provides a low-glare background to reduce eye strain during long exams.
- **Secondary (Mid-Gray):** Used for surface containers and borders to separate content areas without breaking the high-contrast theme.
- **Functional Accents:** Vibrant greens and reds are used for status indicators (answered vs. flagged), but are tuned to maintain high legibility against the dark background.

## Typography

This design system utilizes **Inter** for all core instructional text and exam content due to its exceptional legibility and neutral tone. For technical data—specifically the exam timer and mathematical variables—**Geist** is introduced to provide a precise, monospaced-adjacent feel that aids in rapid digit scanning.

- **Question Content:** Always rendered in `body-lg` to ensure readability of complex sentence structures.
- **Mathematical Formulas:** LaTeX strings should be rendered with slightly increased line-height to accommodate superscripts and subscripts without clipping.
- **The Timer:** Uses a fixed-width numerical font (Geist) to prevent "jumping" text as seconds count down.

## Layout & Spacing

The layout follows a **Fixed Grid** model on desktop to keep the reading line length optimal for exam questions (max 700px for the main content area). 

- **Structure:** A two-column layout is preferred for desktop, with the question taking the wide left column and the "Question Navigator" and "Timer" pinned to a narrower right sidebar.
- **Mobile:** Elements reflow into a single column. The "Timer" and "Progress Bar" remain sticky at the top of the viewport.
- **Rhythm:** A 4px baseline grid ensures tight, logical grouping of related elements (e.g., an answer radio button and its label).

## Elevation & Depth

To maintain a focused and modern look, the design system avoids traditional drop shadows. Instead, it uses **Tonal Layers and Low-Contrast Outlines**.

- **Level 0 (Background):** The deepest charcoal (#121212).
- **Level 1 (Cards/Containers):** A slightly lighter gray (#1A1A1A) with a thin 1px border (#333333).
- **Level 2 (Popovers/Modals):** Same as Level 1 but with a 1px primary-colored (Neon Yellow) border to indicate focus and interruption.
- **Interaction:** Hover states do not lift elements; instead, they change the border color to the primary neon yellow or increase the border thickness.

## Shapes

The design system uses **Soft (Level 1)** roundedness. Elements have a subtle 0.25rem (4px) corner radius. This choice strikes a balance between the "sharpness" of professional software and the "accessibility" of modern web apps. 

- **Buttons & Inputs:** Follow the 4px radius consistently.
- **Selection Chips:** (e.g., Question Numbers) are square with 4px radius, unless they represent a state (like "Flagged"), where they might use a clipped-corner visual.
- **Progress Bars:** Maintain the 4px radius for the track and the fill.

## Components

### Buttons
- **Primary:** Solid Neon Yellow background with Black text. Bold weight. No shadow.
- **Secondary:** Transparent background with 2px Neon Yellow border.
- **Ghost:** Gray text that turns Neon Yellow on hover.

### Question Navigation Chips
- **Default:** Gray border, white text.
- **Answered:** Solid Green background, white text.
- **Flagged for Review:** Solid Orange/Yellow background, black text.
- **Current:** 2px Neon Yellow border with a small dot indicator.

### Input Fields (Multiple Choice)
- **Radio/Checkbox:** Custom square design with 4px radius. When selected, the entire container row gains a Neon Yellow border and a 10% opacity Neon Yellow background tint.

### The Timer
- High-prominence display using the `label-timer` token. When time is less than 5 minutes, the text color shifts from white to `accent_error` (Red) and pulses subtly.

### LaTeX Containers
- Mathematical formulas should be centered within a dedicated container with a #1A1A1A background, ensuring the white/light-gray formula glyphs have maximum contrast.