---
name: saas-landing-page-ui
description: Design, implement, or review high-polish SaaS landing pages using a four-level UI quality rubric and local Figma reference renders. Use for SaaS marketing pages, hero sections, navigation, product visuals, conversion copy, motion critique, and design-to-code quality reviews.
license: MIT
metadata:
  version: "1.0.0"
---

# SaaS Landing Page UI

Use this skill to design, implement, or critique SaaS landing pages against a professional UI-quality bar. The skill is optimized for marketing pages that need strong conversion flow, product-led visuals, clear hierarchy, and polished details.

The bundled reference pack is based on the source video and Figma file listed in `references/source.json`. Treat `references/renders/level-4.png` as the golden-quality target, and `level-1.png` through `level-3.png` as progression examples and anti-pattern context.

## When to Use

Use this skill when the user asks to:

- Build or redesign a SaaS landing page, homepage, hero, pricing/product marketing section, or feature page.
- Review a page for visual polish, conversion quality, product storytelling, or design-to-code fidelity.
- Improve navigation, mega menus, product screenshots, social proof, feature cards, bento grids, CTAs, or page flow.
- Turn a Figma landing-page reference into frontend implementation guidance.
- Diagnose why a SaaS page feels generic, template-like, flat, or unfinished.

Do not use it for authenticated app UI, dashboards, CRUD flows, or broad brand identity work unless the request specifically concerns landing-page presentation.

## Reference Files

Load only what is needed:

| Need | Reference |
| --- | --- |
| Source links, Figma IDs, local render paths | `references/source.json` |
| Node IDs, dimensions, frame roles, export notes | `references/figma-manifest.json` |
| Video-derived rubric by quality level | `references/video-summary.md` |
| Review checklist and scoring gates | `references/checklist.md` |
| Copywriting examples from the reference file | `references/extracted-copy.md` |
| Visual target and progression examples | `references/renders/*.png` |

## Quality Levels

- **Level 1 — Template/basic:** Functionally usable, but generic. Repetitive section layouts, stock imagery, weak hierarchy, vague copy, scattered color, and minimal motion.
- **Level 2 — Intentional but shallow:** Better identity and product visuals. Improved hero structure, clearer CTAs, simple motion, and some navigation hierarchy, but still not strongly curated.
- **Level 3 — Cohesive/product-led:** Stronger product storytelling. Curated dashboard crops, structured page rhythm, bento or interactive sections, mega menus, sharper copy, and useful brand/product cues.
- **Level 4 — Crafted/professional:** Every section feels made for the exact content. Visuals show how the product helps, copy sells outcomes, color is threaded deliberately, motion is subtle and high quality, and details encourage scrolling.

## Required Workflow

1. **Clarify the page job.** Identify the target user, desired conversion, core product promise, primary CTA, and proof points.
2. **Inventory the page.** List sections, navigation items, CTAs, product visuals, copy blocks, social proof, and interactive moments.
3. **Select the target level.** Default to Level 4 for production landing pages unless the user asks for a quick MVP.
4. **Compare against the rubric.** Use `references/checklist.md` and the local renders to classify current quality and find gaps.
5. **Prescribe specific improvements.** Tie every recommendation to layout, visuals, typography, copy, navigation, color, motion, or details.
6. **Implement or review in small passes.** Start with structure and hierarchy, then product visuals, then copy, then color/detail/motion.
7. **Verify visually.** Run the app, capture screenshots when possible, and compare the result against the Level 4 reference and checklist.

## Design Principles

### Layout and Flow

- Avoid repeating the same left/right section pattern down the page.
- Build rhythm: vary section density, width, alignment, cards, grids, and visual emphasis.
- Make content feel made for the available space, not dropped into a template.
- Use framing lines, bento layouts, layered cards, or focused crops only when they help comprehension.
- Optimize for continued scrolling: each section should create a reason to move to the next.

### Product Visuals

- Prefer real or realistic product UI over generic stock imagery.
- Crop and compose product visuals to show the feature insight, not the whole dashboard by default.
- Let product visuals carry part of the narrative so copy can become shorter.
- Use hover states, overlays, or focused panels to reveal details when they are useful.

### Typography and Copy

- Establish strong hierarchy through size, weight, width, color, and spacing.
- Keep headings short and outcome-oriented.
- Move copy from **what the product does** to **how it helps the customer**.
- Reduce long paragraphs; let visuals and concise subcopy do the work.
- Match repeated CTAs when they lead to the same destination.

### Navigation and CTAs

- Give the primary CTA clear priority in the header and hero.
- Balance nav weight across the header; avoid a visually heavy right side.
- Make important product/resource links richer than simple flat text when the product has depth.
- Use mega menus to reveal product breadth, not to show decorative content.

### Color and Brand

- Do not scatter accent color wherever emphasis is needed.
- Thread color through product visuals, key highlights, CTA states, and proof elements.
- Use neutral surfaces to let product colors and CTAs stand out.

### Motion and Detail

- Use motion to improve orientation, reveal context, or add polish.
- Prefer subtle blur, slide, fade, and state continuity over flashy effects.
- Preserve continuity in menus and hover states instead of abruptly closing/opening content.
- Add detail last: micro-interactions, hover reveals, alignment refinements, and spacing polish.

## Implementation Guidance

- Start from semantic HTML and responsive structure before visual polish.
- Build reusable sections only when the page genuinely repeats a pattern; avoid abstracting every card too early.
- Keep content editable: headings, subcopy, CTA labels, nav items, and cards should be easy to change.
- Use accessible contrast, focus states, keyboard-reachable menus, and reduced-motion handling.
- When implementing from Figma, cite node IDs from `references/figma-manifest.json` in notes or PR summaries when helpful.
- Do not copy exact source assets or brand copy into a commercial page unless the user confirms rights; use the reference as a quality benchmark.

## Review Output Format

For page reviews, return:

1. Current estimated level and target level.
2. Highest-impact gaps, grouped by layout, visuals, typography/copy, navigation/CTA, color, motion/detail.
3. Concrete changes to make next, ordered by impact.
4. Verification checklist and screenshots/artifacts used.

For implementation tasks, include exact files changed, screenshots when available, and the verification command used.

