---
name: service-rewriter
description: >
  Analyse all sibling microservices for structural and coding patterns, then rewrite a target service
  to be fully consistent with those patterns while fixing any divergences. Use when the user says
  "переписать сервис", "исправить сервис", "привести к стандарту", "rewrite service", "fix service",
  "align service with patterns", or any similar request involving one of the services under
  apps/bot/services/. Always analyse first, then rewrite — never rewrite without the analysis phase.
---

# Service Rewriter

Skill for analysing pattern consistency across all microservices and rewriting a target service
to be fully compliant with those patterns.

---

## Phase 1 — Identify the target service

Before doing anything else, ask the user which service they want to rewrite if they haven't said.
The services live under `apps/bot/services/`. List what's available:

```bash
ls apps/bot/services/
```

Accept answers like "admin", "payment-service", "booking" — normalise to the full directory name.

---

## Phase 2 — Pattern Analysis (read all sibling services)

Read every `src/*.ts` file from ALL services **except** the target. Build a mental model of:

### 2.1 Structural patterns to extract

For each service, record:

| Category | What to check |
|---|---|
| `RequestContext` type | Which fields are present (callerName, callerUserId, method, path, query, requestId, traceparent, url, …) |
| Replay protection | Raw Redis `set NX EX` vs `bus.checkReplay()`. Key prefix pattern. TTL in seconds |
| `createRequestContext` shape | Health bypass present? Auth flow order? Fields returned |
| `dispatch` routing style | if/else chain? Switch? Route table? |
| `handleError` shape | Error class hierarchy check, DownstreamError handling, logging format |
| `writeAudit` soft-fail | try/catch around audit, logger.error on failure, no re-throw |
| Validation location | inline in router vs dedicated `validation.ts` |
| HTTP client | Raw fetch vs typed client? Signed or unsigned? Timeout? response.ok check? |
| Body parsing | Local `readRequestBody` helper vs shared package |
| `readIdFromPath` | In validation.ts vs inline in router |
| BigInt serialisation | `.toString()` in mapping vs shared helper |
| Audit events | `audit()` (fast) + `writeAuditLog()` (persistent) dual-write pattern |
| Logger | Structured JSON, service field fixed, error goes to stderr |
| Config | `requireEnv`, `readPort`, positive integer helpers, secret rotation via `_NEXT` suffix |
| index.ts startup | connect order (Redis first), graceful shutdown, readiness checks, metrics endpoint |

### 2.2 Majority pattern = the standard

For each category, identify what **most** services do. That is the canonical pattern.
Note any service that deviates — it is either intentional (document why) or a bug.

### 2.3 Write the analysis report

Output a clear, structured comparison table:

```
PATTERN ANALYSIS — <target-service>
====================================

Category                | Canonical pattern          | Target service          | Status
------------------------|----------------------------|-------------------------|--------
Replay protection       | bus.checkReplay(), 300s    | raw Redis set, 60s      | DIVERGES
traceparent in context  | not present                | present, unused         | BUG
postJson statusCode     | real code from downstream  | hardcoded 201           | BUG
DLQ body validation     | parseXxxInput() in valid.ts| inline type-cast        | DIVERGES
...
```

Status values: `OK` | `DIVERGES` | `BUG`

For each `BUG` or `DIVERGES`, briefly explain the impact (silent data loss, wrong HTTP code, etc.).

---

## Phase 3 — Confirm scope with the user

Present the analysis table and ask:

> "Я нашёл N расхождений. Хочешь, чтобы я исправил все, или только BUG-и, или выбери конкретные?"

Wait for confirmation before proceeding to Phase 4.

---

## Phase 4 — Rewrite

Work file-by-file in dependency order:

```
errors.ts → config.ts → logger.ts → http-response.ts → validation.ts → signed-http-client.ts (if exists) → <service>-router.ts → index.ts
```

For each file:

1. **Mark task in_progress** via TaskUpdate
2. **Read the current file** completely before touching it
3. **Apply only the changes** identified in Phase 2 — do not refactor unrelated things
4. **Preserve every existing comment** and add a new JSDoc comment to every function/method that
   doesn't have one, following the project style:
   - Class-level `/** ... */` explaining responsibility
   - Method-level `/** ... */` explaining what it does and why
   - Inline `//` comments for non-obvious logic steps (one per significant block)
5. **Write the file** via Edit (prefer) or Write for full rewrites
6. **Mark task completed**

### Comment style rules (extract from existing code)

```ts
/**
 * Краткий глагол, описывающий ответственность функции/класса.
 *
 * Дополнительный абзац только если есть важный контракт или нетривиальная причина.
 */
function doSomething(input: SomeType): ResultType {
  // Причина, почему эта строка делает именно это, а не что-то другое.
  const step = ...
  // Следующий шаг, с объяснением если неочевидно.
  return ...
}
```

Rules:
- Every exported function and public method has a JSDoc comment
- Private methods have a JSDoc comment if their name doesn't self-explain
- Inline comments explain *why*, not *what* — never `// set status to 200`
- Comments are in the same language as the existing file (Russian in this codebase)
- Do NOT add comments to trivial one-liners like `return response.json()`

### Common fixes to apply (catalogued from admin-service analysis)

| Fix | How |
|---|---|
| `postJson` hardcodes status | Make `requestJson` return `{ body, statusCode }`, check `response.ok`, throw `DownstreamError` |
| Replay TTL too short | Align to 300s (security-service standard) |
| `traceparent` in context unused | Remove field entirely from `RequestContext` |
| Inline body validation | Extract to `parseXxxInput()` in `validation.ts` |
| `handleError` missing DownstreamError | Add branch before generic error check: `if (error instanceof DownstreamError) { sendJson(res, error.responseBody, error.statusCode) }` |
| Missing `response.ok` check | After `response.json()`, throw `DownstreamError(response.status, body)` if `!response.ok` |

---

## Phase 5 — Verification

After all files are written:

1. Run TypeScript compiler to catch type errors:
   ```bash
   cd apps/bot/services/<target-service> && npx tsc --noEmit 2>&1 | head -50
   ```

2. Check imports are consistent (no missing exports):
   ```bash
   grep -r "from '\.\/" apps/bot/services/<target-service>/src/ | sort
   ```

3. Visually diff every changed file:
   ```bash
   git diff apps/bot/services/<target-service>/src/
   ```

4. Confirm with the user: show the diff summary and ask if anything looks wrong.

---

## Guardrails

- **Never remove business logic** — only structural/pattern changes
- **Never rename public types or exports** without checking all importers first:
  ```bash
  grep -r "from '.*<service-name>" apps/ packages/
  ```
- **Never touch `dist/` files** — they are compiled output, not source
- **Never rewrite tests** unless the user explicitly asks
- If a deviation is intentional (e.g., admin-service reads payment DB directly for
  `listPaymentSagas` because payment-service has no list endpoint), document it in a comment
  and mark it `OK — intentional` in the analysis table

---

## Output format

After completing all phases, reply with:

```
Готово. Исправлено N файлов:
- errors.ts — добавлен DownstreamError
- signed-http-client.ts — убран hardcoded 201, добавлена проверка response.ok
- admin-router.ts — убран traceparent, TTL 60→300, parseReplayDlqInput
- validation.ts — добавлен parseReplayDlqInput

TypeScript: 0 ошибок
```

Then show file links for the user to open.
