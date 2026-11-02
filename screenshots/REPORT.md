# Mobile and Project Image Correction Report

Date: 2026-11-01

## Changes

- Replaced the Approach section placeholder in `about.html` with a graded architectural workstation photograph.
  - Generated `images/approach-workstation.jpg` at 1600×2000 (4:5) from a licensed Pexels photograph.
  - Cropped to focus on the monitor, keyboard and mouse; no people are shown.
  - Added warm, charcoal-neutral grading and `object-fit: cover` so it fills the existing container without distortion.
- Added a favicon generated from the geometric logo in `images/favicon/` and linked it in all five HTML pages.
- Fixed the 320px cream-section heading overflow in `css/style.css`.
  - `.home-intro-lead` is now allowed to shrink (`min-width: 0`).
  - At `max-width: 560px`, the intro heading now uses `clamp(2.1rem, 11vw, 5rem)`.
  - At 320px the heading is `35.2px`, spans `20px–300px`, and no longer crosses the viewport edge.
- Added per-image aspect ratios to project cards.
  - `js/main.js` now adds `--media-ratio` from `projectImageDimensions`.
  - At `max-width: 780px`, project-card media uses `aspect-ratio: var(--media-ratio, 4 / 3)` instead of forcing `4 / 3` cropping.
- Added the requested two-image sets by project order.
  - Project 4, `Five-Bedroom Duplex with Two-Bedroom Units` (`id: 4`): `Fourth design iv.jpeg` and `Fourth design v.jpeg`.
  - Project 5, `Residential Project` (`id: 3`): `Fifth design.jpeg` and `Fifth design ii.jpeg`.
  - Generated `five-bedroom-duplex-two-bedroom-units-01/02.jpg` (1323×1189, 756×1008) and `residential-project-01/02.jpg` (1481×941, 1381×941).
  - Updated `js/data.js` covers, galleries, and dimensions.

## Verification

Tested at 320, 360, 375, 390, and 430px on `index.html`, `projects.html`, `project.html?id=4`, and `project.html?id=5`.

- No horizontal page overflow at any tested width.
- Cream heading fits its grid column at every width; at 320px it ends at 300px.
- Project cards preserve their natural image ratios on phones; no forced 4:3 crop.
- All five project cards now have images:
  1. Mixed-Use Development
  2. Hotel
  3. Three-Bedroom Duplex
  4. Five-Bedroom Duplex with Two-Bedroom Units
  5. Residential Project
- Hamburger menu:
  - Opens and closes.
  - Updates `aria-expanded`.
  - Locks touch/wheel scrolling.
  - Closes on Escape and returns focus to the toggle.
  - Closes on nav-link activation.
- No JavaScript console errors and no failed resource requests during the final audit.
- All 13 image paths referenced by `js/data.js` exist.

## Image Assignment Note

The design-file numbering follows display order: `Fourth Design` belongs to the fourth project (`Five-Bedroom Duplex with Two-Bedroom Units`), and `Fifth design` belongs to the fifth project (`Residential Project`). Both Fifth design files classify strongly as modern duplex exterior renders.

`Residential Project` still has `expectedImageCount: 6` because its description references exterior views, floor plans, interior studies, and material moodboards. Only the two Fifth design exterior renders were present, so the gallery currently shows two images; the other four asset types remain unsupplied.

## Screenshots

- Page heroes: `index-320-hero.png`, `index-375-hero.png`, `index-430-hero.png`
- Cream intro section: `index-320-intro.png`, `index-375-intro.png`, `index-430-intro.png`
- Project cards: `card-01-320.png` through `card-05-430.png`
- Projects pages: `projects-320-full.png`, `projects-375-full.png`, `projects-430-full.png`
- Project 4 detail: `project-4-320-hero.png`, `project-4-375-hero.png`, `project-4-430-hero.png` and matching `-gallery.png` files
- Project 5 detail: `project-5-320-hero.png`, `project-5-375-hero.png`, `project-5-430-hero.png` and matching `-gallery.png` files
- Open mobile menu: `nav-open-320.png`
- Approach section image: `about-approach-1440.png`, `about-approach-390.png`
- Raw audit data: `audit.json`
