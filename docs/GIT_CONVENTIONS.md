# Git Conventions

Соглашения по ведению git-истории в проекте. Основаны на практиках Google, Microsoft, Airbnb и стандарте [Conventional Commits](https://www.conventionalcommits.org/).

---

## Коммиты

### Формат сообщения

```
<type>(<scope>): <subject>

[тело — необязательно]

[footer — необязательно]
```

Все три части разделяются пустой строкой.

---

### Типы (`type`)

| Тип | Когда использовать |
|---|---|
| `feat` | новая функциональность для пользователя |
| `fix` | исправление бага |
| `refactor` | изменение кода без изменения поведения |
| `perf` | улучшение производительности |
| `test` | добавление или исправление тестов |
| `docs` | только документация |
| `style` | форматирование, пробелы, точки с запятой — без изменения логики |
| `build` | изменения системы сборки, зависимостей |
| `ci` | изменения конфигурации CI/CD |
| `chore` | обслуживание репозитория: обновление инструментов, скриптов |
| `revert` | откат предыдущего коммита |

---

### Область (`scope`)

Опциональный контекст: какая часть системы затронута. Примеры для этого проекта:

```
feat(booking): add conflict detection for overlapping slots
fix(auth): handle expired refresh token on mobile
perf(dashboard): memoize heavy analytics query
test(payments): add edge cases for refund flow
docs(api): update OpenAPI spec for /resources endpoint
```

Если изменение затрагивает несколько областей — опустите scope или используйте `*`.

---

### Subject — заголовок

- Максимум **72 символа**
- Повелительное наклонение: `add`, `fix`, `remove` — не `added`, не `adding`
- Строчная буква в начале
- Без точки в конце
- На английском (стандарт для open-source и международных команд) — если команда договорилась на русском, придерживайтесь единообразия

**Хорошо:**
```
feat(telegram): add /mybookings command with pagination
fix(api): return 409 on duplicate booking attempt
refactor(auth): extract token validation into middleware
```

**Плохо:**
```
Fixed bug
update
changes to api
WIP
feat: Added new feature for the booking system that allows users...
```

---

### Тело коммита

Пишется если нужно объяснить **почему** — не **что** (это видно из diff).

```
fix(payments): retry on transient Stripe timeout

Stripe occasionally returns 503 during peak hours.
Previously the error propagated to the user immediately.
Now we retry up to 3 times with exponential backoff
before surfacing the failure.

Closes #412
```

Правила:
- Перенос строки после 72 символов
- Объясняйте мотивацию, контекст, компромиссы
- Ссылайтесь на тикеты: `Closes #123`, `Refs #456`

---

### Footer — breaking changes и ссылки

```
feat(api)!: change booking endpoint response shape

BREAKING CHANGE: field `slot_id` renamed to `resource_slot_id`
in all booking responses. Update all API consumers.

Closes #389
```

Восклицательный знак `!` после type/scope сигнализирует о breaking change.

---

## Ветки

### Именование

```
<type>/<ticket-id>-<short-description>
```

| Тип ветки | Пример |
|---|---|
| Фича | `feat/MET-142-telegram-mybookings` |
| Фикс | `fix/MET-203-duplicate-booking-409` |
| Рефакторинг | `refactor/MET-98-extract-auth-middleware` |
| Хотфикс | `hotfix/MET-317-stripe-503-retry` |
| Релиз | `release/1.4.0` |

**Правила:**
- Только строчные буквы
- Разделитель — дефис, не underscore
- Без пробелов, без спецсимволов
- Максимум ~50 символов в описании
- Всегда с привязкой к тикету — ветки без контекста не принимаются

---

### Основные ветки

| Ветка | Назначение |
|---|---|
| `main` | production-ready код. Только через PR с review |
| `develop` | интеграционная ветка. Сюда сливаются feature-ветки |
| `release/*` | стабилизация перед релизом. Только bugfix |
| `hotfix/*` | экстренный фикс прямо в `main` |

---

## Стратегия слияния

### Feature → develop

Используйте **squash merge** или **rebase**.

Squash — когда история ветки рабочая/черновая и не нужна в `develop`:
```bash
git merge --squash feat/MET-142-telegram-mybookings
```

Rebase — когда коммиты в ветке атомарные и осмысленные:
```bash
git rebase develop
git merge --ff-only
```

Никогда не делайте `merge --no-ff` с merge-commit на feature → develop — это засоряет историю.

### develop → main (релиз)

Только через PR. Merge commit допустим:
```
chore(release): merge develop into main for v1.4.0
```

### Hotfix → main и develop

```bash
git checkout -b hotfix/MET-317-stripe-503-retry main
# ... fix ...
git checkout main && git merge --no-ff hotfix/...
git checkout develop && git merge --no-ff hotfix/...
git branch -d hotfix/...
```

---

## Pull Request

### Размер PR

- **Оптимально: до 400 строк diff**
- Больше 800 строк — обоснуйте или разбейте
- Один PR = одна логическая задача

Крупный рефакторинг нельзя прятать в PR с фичей.

### Описание PR

Обязательная структура:

```markdown
## Что сделано
Краткое описание изменений (2–4 предложения).

## Зачем
Контекст: какую проблему решает, какой тикет закрывает.

## Что проверено
- [ ] локально прошли тесты
- [ ] проверены edge cases вручную (перечислить)
- [ ] обновлена документация / типы / OpenAPI при необходимости

## Риски и ограничения
Что может сломаться, на что обратить внимание при review.

Closes #142
```

### Правила review

**Автор:**
- Назначает ревьюеров сам
- Отвечает на все комментарии, не закрывает их молча
- Не пушит новые коммиты в середине активного review без предупреждения

**Ревьюер:**
- Approve = «готово к merge», не «я посмотрел»
- Пишет конкретно: что не так и почему, а не просто «переделай»
- Разделяет: `[blocking]` — нельзя мержить, `[nit]` — незначительное, `[question]` — уточнение

**Merge:**
- Минимум 1 approve (в критичных сервисах — 2)
- CI должен быть зелёным
- Squash или rebase — на усмотрение автора в соответствии с качеством истории

---

## Атомарность коммитов

Каждый коммит должен:

1. **Компилироваться** — после него `tsc` не падает
2. **Проходить тесты** — после него `test` не красный
3. **Быть реверсируемым** — `git revert` должен отменить изменение чисто

Никогда:
- Не коммитьте сломанный код с пометкой «WIP — потом починю»
- Не добавляйте в один коммит несвязанные изменения
- Не коммитьте `.env`, секреты, `node_modules`, сгенерированные файлы

---

## Rebase и history rewriting

**Можно (до push или в своей ветке):**
```bash
git rebase -i HEAD~4   # причесать историю перед PR
git commit --amend     # исправить последний коммит
```

**Нельзя:**
- `git push --force` на `main` или `develop`
- Rebase ветки, которую уже тянули другие разработчики
- `git push --force-with-lease` без согласования команды

На своей feature-ветке `--force-with-lease` допустим.

---

## Теги и релизы

Теги ставятся на `main` после каждого релиза по [Semantic Versioning](https://semver.org/):

```bash
git tag -a v1.4.0 -m "release: v1.4.0 — telegram mybookings, conflict detection"
git push origin v1.4.0
```

- `MAJOR` — breaking change в API или поведении
- `MINOR` — новая функциональность, обратная совместимость сохранена
- `PATCH` — bugfix

---

## Частые ошибки

| Ошибка | Почему это плохо | Как правильно |
|---|---|---|
| `fix: fix` | Бесполезно при bisect и blame | `fix(auth): handle null user in session parser` |
| Один коммит на всю фичу | Нельзя найти где сломалось | Дробите по логическим шагам |
| Коммит сразу в `main` | Нет review, нет истории решений | Всегда через PR |
| Мержить без зелёного CI | Риск сломать `main` для всех | CI обязателен |
| `git add .` без проверки | Случайные файлы в историю | `git diff --staged` перед коммитом |
| Merge вместо rebase для синхронизации | Засоряет историю merge-коммитами | `git rebase develop` в feature-ветке |
