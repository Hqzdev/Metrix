# Web App Routes

This directory contains Next.js App Router routes for the public web experience.

Route files should stay thin:

- keep page-specific composition in `page.tsx`;
- move reusable UI into `apps/web/components`;
- keep shared metadata and layout concerns in `layout.tsx`;
- avoid data access or service orchestration directly in visual components.
