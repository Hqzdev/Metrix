# Web Components

Shared React components for `apps/web`.

## Structure

- `booking` — interactive booking surfaces and booking-specific UI.
- `landing` — homepage/landing experience components, including `landing/sections`.
- `layout` — headers, shells, page chrome, and footer composition.
- `media` — image/media helpers.
- `metrics` — visual metric helpers such as animated counters.
- `pages` — reusable page templates for static marketing/resource/legal pages.
- `providers` — client providers and app-level client initializers.
- `ui` — low-level reusable UI primitives grouped by interaction type.

## UI Structure

- `ui/actions` — buttons and toggle controls.
- `ui/data-display` — cards, tables, charts, badges, skeletons, carousels, calendars.
- `ui/feedback` — alerts, toasts, spinners, sonner, feedback hooks.
- `ui/forms` — inputs, labels, fields, form wrappers, selection controls.
- `ui/hooks` — UI-only hooks.
- `ui/layout` — separators, sidebars, scroll areas, resizable/collapsible layout primitives.
- `ui/navigation` — menus, breadcrumbs, pagination, tabs, command palette.
- `ui/overlays` — dialogs, sheets, drawers, popovers, tooltips.

## Import Rule

Import from the component category path:

```tsx
import { MarketingPageShell } from "@/components/layout/marketing-page-shell";
import { ResourcePage } from "@/components/pages/resource-page";
import { Button } from "@/components/ui/actions/button";
```

Keep `ui` primitives in `components/ui/<category>`. Higher-level page and product components should live outside `ui`.

## Boundary Rule

Use `pages` for reusable page templates, not actual route files. Actual routes stay in `apps/web/app`.

Use `layout` for cross-page chrome. Use feature folders such as `booking` or `landing` when a component belongs to one product surface.
