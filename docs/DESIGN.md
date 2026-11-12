# Design system

The UI uses [shadcn/ui](https://ui.shadcn.com) conventions on Tailwind CSS 4,
with [Lucide](https://lucide.dev/icons/) icons.

## Principles

- Reuse before creating. Check `components/ui`, `components/form`, and
  `components/layout` first.
- Use design tokens (`bg-background`, `text-muted-foreground`, `border`, ...),
  never raw colors such as `bg-zinc-900` or `#18181b` in components.
- Every screen must work in light and dark mode, on mobile and desktop.
- Accessibility is required, not optional (see checklist below).

## Tokens

Defined in `frontend/src/index.css` as CSS variables (OKLCH) and exposed to
Tailwind through `@theme inline`.

| Token | Use |
|---|---|
| `background` / `foreground` | Page background and main text |
| `card` / `card-foreground` | Card surfaces |
| `primary` / `primary-foreground` | Main actions |
| `secondary`, `accent`, `muted` | Subtle surfaces, hover, secondary text |
| `destructive` | Errors and dangerous actions |
| `success` | Success messages |
| `border`, `input`, `ring` | Borders, input borders, focus ring |
| `--radius` | Base corner radius (`rounded-md`, `rounded-lg`, `rounded-xl`) |

Dark mode: the `dark` class on `<html>` switches token values. The initial
theme is applied in `index.html` before first paint; `ThemeToggle` saves the
choice in `localStorage`.

## Components

| Component | Path | Notes |
|---|---|---|
| Button | `components/ui/button.jsx` | Variants: default, destructive, outline, secondary, ghost, link. Sizes: default, sm, lg, icon. `asChild` for links |
| Input, Label | `components/ui/input.jsx`, `label.jsx` | Use through `FormField` |
| Card | `components/ui/card.jsx` | Header, Title, Description, Action, Content, Footer |
| Alert | `components/ui/alert.jsx` | Variants: default, destructive, success |
| Badge, Separator, Skeleton, Spinner | `components/ui/*` | Small primitives |
| FormField | `components/form/FormField.jsx` | Label + control + hint/error, wires `id`, `aria-invalid`, `aria-describedby` |
| PasswordInput | `components/form/PasswordInput.jsx` | Show/hide toggle |
| SubmitButton | `components/form/SubmitButton.jsx` | Pending spinner, disables itself |
| FormAlert | `components/form/FormAlert.jsx` | Form-level error or success |
| AuthLayout, AppLayout | `components/layout/*` | Page shells |

Adding a shadcn component: the project has `components.json` (style
`new-york`, JSX, Lucide). You can run `pnpm dlx shadcn@latest add <name>` from
`frontend/`, or copy the component source by hand. Install any Radix package
it needs in `frontend/` only (`pnpm --filter frontend add <package>`).

## Icons

- Use `lucide-react` only. Browse names at https://lucide.dev/icons/.
- Import named icons (`import { LogIn } from 'lucide-react'`) so unused icons
  are tree-shaken.
- Decorative icons get `aria-hidden="true"`. Icon-only buttons need an
  `aria-label`.
- Default size comes from the parent (`size-4` in buttons). Override with
  `className="size-5"`.

## Images

Order of preference:

1. **SVG** for logos, icons, and illustrations (scales, tiny, themeable).
2. **AVIF** for photos (smallest), with **WebP** as a fallback.
3. **PNG** only if AVIF/WebP is not possible (for example a third-party
   requirement or a tool that cannot export them).

For raster images, use `<picture>` with fallbacks and always set `width`,
`height`, and `alt`:

```jsx
<picture>
  <source srcSet={heroAvif} type="image/avif" />
  <source srcSet={heroWebp} type="image/webp" />
  <img src={heroPng} alt="Team working together" width={1200} height={630} loading="lazy" decoding="async" />
</picture>
```

- Use `alt=""` for decorative images.
- Use `loading="lazy"` for images below the fold, not for the main hero image.
- Keep source images in `src/assets/` (hashed by Vite) and static files that
  need a fixed URL (favicon) in `public/`.

## Accessibility checklist

- Every input has a visible label (`FormField`).
- Errors are text, linked with `aria-describedby`, and the field gets `aria-invalid`.
- Focus is always visible (`focus-visible:ring`). Do not remove outlines.
- Interactive elements are real `<button>` or `<a>` elements.
- Color is never the only signal (icons or text accompany status colors).
- Test pages with keyboard only (Tab, Shift+Tab, Enter, Space).
