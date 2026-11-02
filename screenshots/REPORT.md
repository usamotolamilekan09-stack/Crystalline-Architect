# Mobile and Project Image Correction Report

Date: 2026-11-01

## Changes

- Fixed the 320px cream-section heading overflow in `css/style.css`.
  - `.home-intro-lead` is now allowed to shrink (`min-width: 0`).
  - At `max-width: 560px`, the intro heading now uses `clamp(2.1rem, 11vw, 5rem)`.
  - At 320px the heading is `35.2px`, spans `20px–300px`, and no longer crosses the viewport edge.
- Added per-image aspect ratios to project cards.
  - `js/main.js` now adds `--media-ratio` from `projectImageDimensions`.
  - At `max-width: 780px`, project-card media uses `aspect-ratio: var(--media-ratio, 4 / 3)` instead of forcing `4 / 3` cropping.
- Added the two exterior images for `Five-Bedroom Duplex with Two-Bedroom Units` (`id: 4`).
  - `images/projects/five-bedroom-duplex-two-bedroom-units-01.jpg` (1323×1189)
  - `images/projects/five-bedroom-duplex-two-bedroom-units-02.jpg` (756×1008)
  - Updated `js/data.js` cover, gallery, and dimensions.

## Verification

Tested at 320, 360, 375, 390, and 430px on `index.html`, `projects.html`, `project.html?id=4`, and `project.html?id=5`.

- No horizontal page overflow at any tested width.
- Cream heading fits its grid column at every width; at 320px it ends at 300px.
- Project cards preserve their natural image ratios on phones; no forced 4:3 crop.
- Five project cards render in order:
  1. Mixed-Use Development
  2. Hotel
  3. Three-Bedroom Duplex
  4. Five-Bedroom Duplex with Two-Bedroom Units
  5. Residential Project (placeholder — no source assets supplied)
- Hamburger menu:
  - Opens and closes.
  - Updates `aria-expanded`.
  - Locks touch/wheel scrolling.
  - Closes on Escape and returns focus to the toggle.
  - Closes on nav-link activation.
- No JavaScript console errors and no failed resource requests during the final audit.
- All 13 image paths referenced by `js/data.js` exist.

## Image Assignment Note

`Fourth design iv.jpeg` is clearly an exterior rendering and is the cover for project 4. `Fourth design v.jpeg` is the second image, confirmed by the client as the intended second exterior image.

The fifth visible card, `Residential Project` (`id: 3`), remains a placeholder because no matching source images, PDF pages, floor plans, interiors, or moodboards were found in `images/`.

## Screenshots

- Page heroes: `index-320-hero.png`, `index-375-hero.png`, `index-430-hero.png`
- Cream intro section: `index-320-intro.png`, `index-375-intro.png`, `index-430-intro.png`
- Project cards: `card-01-320.png` through `card-05-430.png`
- Projects pages: `projects-320-full.png`, `projects-375-full.png`, `projects-430-full.png`
- Project 4 detail: `project-4-320-hero.png`, `project-4-375-hero.png`, `project-4-430-hero.png` and matching `-gallery.png` files
- Project 5 detail: `project-5-320-hero.png`, `project-5-375-hero.png`, `project-5-430-hero.png` and matching `-gallery.png` files
- Open mobile menu: `nav-open-320.png`
- Raw audit data: `audit.json`
