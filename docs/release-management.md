# Release management

Metrix uses semantic-release to generate root versions, GitHub releases, and
`CHANGELOG.md` entries from conventional commits.

## CI command

The Release workflow runs semantic-release through `npx -p ...` so release
tooling does not add root dependency or lockfile churn.

## Flow

1. Use conventional commit subjects such as `fix(api): ...`,
   `feat(bot): ...`, and `docs(web): ...`.
2. Merge to `main`.
3. The Release workflow runs semantic-release, updates `CHANGELOG.md`, commits
   release notes, and creates the Git tag.

No npm publish step is configured because this repository currently keeps its
packages private.
