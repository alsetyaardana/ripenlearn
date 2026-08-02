---
name: Ripen
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#424843'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#727972'
  outline-variant: '#c2c8c0'
  surface-tint: '#466550'
  primary: '#163422'
  on-primary: '#ffffff'
  primary-container: '#2d4b37'
  on-primary-container: '#99baa1'
  inverse-primary: '#adcfb4'
  secondary: '#4a654a'
  on-secondary: '#ffffff'
  secondary-container: '#ccebc8'
  on-secondary-container: '#506b50'
  tertiary: '#332e25'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a443b'
  on-tertiary-container: '#bab1a5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8ebd0'
  primary-fixed-dim: '#adcfb4'
  on-primary-fixed: '#022110'
  on-primary-fixed-variant: '#2f4d39'
  secondary-fixed: '#ccebc8'
  secondary-fixed-dim: '#b0ceae'
  on-secondary-fixed: '#07200b'
  on-secondary-fixed-variant: '#334d34'
  tertiary-fixed: '#ebe1d4'
  tertiary-fixed-dim: '#cfc5b9'
  on-tertiary-fixed: '#1f1b13'
  on-tertiary-fixed-variant: '#4c463c'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
  unripe-pale: '#DEE5D4'
  ripe-forest: '#1B3022'
  wood-warm: '#5C5346'
  again-red: '#D16A5E'
  hard-orange: '#E5A462'
  good-green: '#8BA889'
  easy-blue: '#6B8E9E'
typography:
  display-lg:
    fontFamily: manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-hanzi:
    fontFamily: manrope
    fontSize: 64px
    fontWeight: '500'
    lineHeight: 80px
  headline-md:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: beVietnamPro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  pinyin-ruby:
    fontFamily: beVietnamPro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: jetbrainsMono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1120px
  reading-width: 680px
---

## Brand & Style

The design system is centered on the metaphor of organic growth and maturation—transitioning from a "seed" (new vocabulary) to "ripe" (mastery). It targets adult professionals who require a focused, high-utility environment that respects their time and cognitive load. 

The aesthetic is **Minimalist with Tactile accents**. It leverages heavy whitespace and a structured grid to ensure clarity, while using subtle "growth" motifs—such as transitions from muted, desaturated tones to rich, full-bodied colors—to celebrate progress without the friction of loud gamification. The interface should feel like a quiet, sunlit study, evoking feelings of calm, persistence, and intellectual growth.

## Colors

The palette is derived from nature: **Sage, Forest, and Leaf greens** paired with **Cream and Soft Wood neutrals**. 

- **Primary (#2D4B37):** Used for core branding, primary actions, and "mastered" states.
- **Secondary (#8BA889):** Used for progress indicators and successful feedback.
- **Neutral (#F9F7F2):** The primary background color, providing a warm, paper-like feel that reduces eye strain compared to pure white.
- **Functional Ratings:** The SRS rating buttons (Again/Hard/Good/Easy) use a sophisticated, slightly desaturated spectrum to maintain the professional tone while providing clear semantic signaling.
- **The Ripening Gradient:** Visual progression should move from `unripe-pale` (low saturation/high lightness) to `primary` (high saturation/low lightness).

## Typography

The typography system must handle the intersection of Hanzi, Pinyin, and Latin scripts with absolute legibility. 

- **Headlines (Manrope):** Chosen for its modern, balanced geometric shapes that complement the density of Hanzi.
- **Body (Be Vietnam Pro):** A humanist sans-serif that offers warmth and exceptional readability for long-form reading passages and chat bubbles.
- **Labels (JetBrains Mono):** Used sparingly for metadata, counters (e.g., "12/30"), and technical tags to provide a "structured" feel to the deck management and exam modes.
- **Reading Passages:** Use `body-lg` with generous line-height (1.6+) to accommodate `pinyin-ruby` text above characters without crowding.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** approach for content-heavy pages and a **Focused Single-Column** for learning activities (Review, Reading, Exam).

- **Desktop:** 12-column grid with 24px gutters. Dashboard uses card-based modules. 
- **Reading/Review Mode:** Content is constrained to a 680px "Reading Width" to minimize eye travel and maximize focus.
- **Mobile:** 4-column grid with 16px margins. Bottom-heavy navigation and large tap targets for SRS buttons.
- **Vertical Rhythm:** A strict 4px baseline grid ensures that ruby text (pinyin) and Hanzi characters remain perfectly aligned across different font sizes.

## Elevation & Depth

To maintain a calm, organic feel, this design system avoids heavy shadows. 

- **Tonal Layering:** Hierarchy is primarily established through subtle shifts in background color. For example, the main surface is `neutral`, while "Due Today" cards use a slightly lighter or warmer tint.
- **Low-Contrast Outlines:** Interactive elements like input fields and inactive cards use 1px borders in `unripe-pale` or soft stone colors.
- **Micro-Shadows:** Only used on active "floating" elements like flipped flashcards or primary action buttons. These are highly diffused (16px+ blur), low-opacity (8-10%), and tinted with the primary forest green rather than pure black.

## Shapes

The shape language is **Rounded (0.5rem / 8px)**, reflecting the organic theme of "ripening" fruit and seeds. 

- **Standard Elements:** Buttons, cards, and input fields use an 8px radius.
- **Large Components:** Flashcards and dashboard containers use 16px (`rounded-lg`) to appear softer and more welcoming.
- **Status Indicators:** Progress rings and deck badges use fully circular (pill-shaped) geometry to contrast against the structured grid of the text.

## Components

- **Flashcards:** A dual-state container. The front features centered Hanzi at `headline-hanzi`. The back uses a vertical stack: Hanzi > Pinyin > Translation > Example. Use a subtle paper-texture grain on the card surface.
- **SRS Buttons:** Four equally-weighted buttons at the bottom of the review screen. Use desaturated versions of the rating colors for the background, with high-contrast text. On mobile, these must span the full width in a 2x2 or 1x4 grid for easy thumb access.
- **Chat Bubbles:** AI bubbles are aligned left with a `tertiary` background; user bubbles are aligned right with a `secondary` (muted green) background. Mastered words within AI text should have a subtle green underline and a weight increase to `600`.
- **Progress Rings:** Used for HSK level progress. The unfilled portion of the ring is `unripe-pale`, while the filled portion uses a gradient from `secondary` to `primary` green.
- **Badges:** "Official HSK" vs "Custom" tags should be small, using `label-caps` typography. Official cards use a wood-tinted border; custom cards use a leaf-green border.
- **Navigation:** A minimal sidebar on desktop with clear icon + text labels. On mobile, use a fixed bottom navigation bar for primary destinations (Dashboard, Review, Chat).