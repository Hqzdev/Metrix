# Code documentation

Metrix uses TypeDoc to generate markdown API reference pages from TypeScript
exports and JSDoc comments.

## Commands

- `npm run docs:typedoc` regenerates `docs/api-reference`.

## Scope

The current TypeDoc config documents the root API facade plus shared bot
packages for auth, contracts, observability, and tracing. Add new entry points
to `typedoc.json` when a package becomes part of the public service contract.

Prefer JSDoc on exported modules, classes, functions, and domain types. Internal
helpers should be marked with `@internal` when they are not intended for the
generated reference.
