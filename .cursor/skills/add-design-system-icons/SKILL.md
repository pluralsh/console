---
name: add-design-system-icons
description: Adds new icon components to the Console design system and exports them from `assets/design-system/src/icons.ts`. Use when creating a new icon from a pasted SVG, converting a Figma-exported SVG into a `createIcon` component, or adding a new brand/logo icon with optional `fullColor` support.
---

# Add Design System Icons

Use this skill when the user wants a new icon added to the Console design system.

Target files:
- `assets/design-system/src/components/icons/<IconName>.tsx`
- `assets/design-system/src/icons.ts`

## Quick Rules

- Follow the existing icon pattern in `assets/design-system/src/components/icons/createIcon.tsx`.
- Default to `export default createIcon(...)` because that is the established icon system pattern in this repo.
- Keep icon components minimal: imports, blank line, `export default createIcon(...)`.
- Add the export to `assets/design-system/src/icons.ts` in alphabetical order.
- After substantive edits, run `ReadLints` on the changed icon file and `icons.ts`.
- Do not remove existing comments.

## First Step

Before editing, inspect:
- `assets/design-system/src/components/icons/createIcon.tsx`
- One nearby standard icon for simple SVG conversion
- One nearby logo icon if `fullColor` is likely needed
- The relevant section of `assets/design-system/src/icons.ts`

## Workflow Choice

1. Determine which workflow applies.

**Standard icon**
- The user pasted raw SVG from Figma or another design tool.
- The icon should be theme-colored with `color`.
- `fullColor` is not needed.

**Brand/logo icon**
- The user wants a vendor or product logo.
- The SVG usually comes from an external source.
- `fullColor` is usually needed so the logo can render in brand colors while still supporting monochrome usage.

## Standard Icon Workflow

Use this for icons like `ChatOutlineIcon`.

### Convert the SVG

- Create `assets/design-system/src/components/icons/<IconName>.tsx`.
- Wrap the SVG with `createIcon`.
- Replace hard-coded `width` and `height` with `width={size}` and, when appropriate, `height={size}`.
- Keep the original `viewBox`.
- Replace hard-coded solid `fill` and `stroke` colors with `{color}`.
- Preserve `fill="none"` where appropriate.
- Preserve geometry and path data exactly unless cleanup is needed for valid JSX.

### JSX conversion rules

- Convert SVG attributes to JSX-safe names:
  - `fill-rule` -> `fillRule`
  - `clip-rule` -> `clipRule`
  - `stroke-linecap` -> `strokeLinecap`
  - `stroke-linejoin` -> `strokeLinejoin`
  - `stroke-width` -> `strokeWidth`
  - `xmlns:xlink` -> `xmlnsXlink`
  - `xlink:href` -> `xlinkHref`
- Keep numbers and path data as-is unless JSX requires quoting.

### Standard icon template

```tsx
import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="..."
      stroke={color}
    />
  </svg>
))
```

## Brand/Logo Icon Workflow

Use this for icons like vendor logos.

### Source the SVG

- Prefer official brand assets first.
- If official assets are hard to fetch, use a reputable public SVG source and sanity-check that the mark matches the brand the user asked for.
- If the brand has multiple marks, confirm you are using the product/service mark the user wants, not the parent-company mark.

### Convert the logo

- Create `assets/design-system/src/components/icons/<BrandName>LogoIcon.tsx` unless the user requested a different name.
- Use `createIcon(({ size, color, fullColor }) => ...)`.
- Replace `width` and `height` with `size`.
- Keep the original `viewBox`.
- When `fullColor` is `false`, the logo should collapse to a single-color icon by using `{color}` for fills/strokes.
- When `fullColor` is `true`, use the brand colors.

### Full-color rules

- Single-color logo:
  - `fill={fullColor ? '#BRAND' : color}`
- Multi-part logo:
  - Each path should use its brand color when `fullColor` is true and `{color}` otherwise.
- Gradient logo:
  - Preserve the gradient structure.
  - Use brand gradient stops when `fullColor` is true.
  - Fall back to `{color}` for all stops when `fullColor` is false.
- Only add `fullColor` when it is useful. Most brand logos need it; most non-logo icons do not.

### Logo icon template

```tsx
import createIcon from './createIcon'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="..."
      fill={fullColor ? '#E6522C' : color}
    />
  </svg>
))
```

## Export Step

After adding the component:

- Add `export { default as <IconName> } from './components/icons/<IconName>'` to `assets/design-system/src/icons.ts`
- Insert it in alphabetical order with the surrounding exports

## Validation Checklist

Before finishing:

- [ ] The component uses `createIcon`
- [ ] `width`/`height` use `size`
- [ ] Original `viewBox` is preserved
- [ ] Hard-coded themeable colors were converted to `color`
- [ ] `fullColor` exists only when appropriate
- [ ] `icons.ts` export was added in alphabetical order
- [ ] `ReadLints` reports no new issues

## Example Requests

**Brand logo request**
- "Add logo icons for Elasticsearch, Loki, Prometheus, and Tempo to `assets/design-system/src/icons.ts` with full-color support."

**Raw SVG request**
- "Create `ChatOutlineIcon` from this SVG and add it to `icons.ts`."

For a pasted SVG like:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="..." stroke="#C5C9D2"/>
</svg>
```

convert it to:

```tsx
import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="..."
      stroke={color}
    />
  </svg>
))
```
