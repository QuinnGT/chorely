# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

Family Command Center -- a Next.js 16 app (App Router) for managing kids' chores, allowances, savings goals, and a reward store. PWA designed mobile-first for iPad/tablet. Stack: React 19, TypeScript (strict), Drizzle ORM with PostgreSQL, Tailwind CSS v4, Vitest, Zod validation, AI SDK (OpenRouter/Ollama).

## Environment Variables

Copy `.env.example` to `.env`. Required and optional vars:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DEFAULT_ADMIN_PIN` | Yes | PIN for admin panel (default: `1234`) |
| `OPENROUTER_API_KEY` | No | AI chat via OpenRouter |
| `OLLAMA_BASE_URL` | No | Local AI via Ollama (default: `http://localhost:11434`) |
| `MEM0_API_KEY` | No | Memory layer for voice assistant |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS voice provider |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | No | AWS Bedrock voice provider |

The app runs without any optional keys -- AI and voice features degrade gracefully.

## Build / Lint / Test Commands

Package manager is **pnpm**. All commands run from the repo root.

```sh
pnpm dev              # Start dev server (Next.js)
pnpm build            # Production build
pnpm lint             # ESLint (eslint-config-next core-web-vitals + typescript)
pnpm test             # Run all tests once (vitest --run)
pnpm test -- --watch  # Watch mode
```

### Running a single test

```sh
pnpm test -- src/lib/__tests__/allowance-engine.test.ts          # by file path
pnpm test -- -t "calculates streak correctly"                     # by test name
pnpm test -- src/components/__tests__/ChoreCheckbox.test.tsx -t "toggles" # both
```

### Database

```sh
docker compose up db                          # Start PostgreSQL 17
pnpm db:push                                  # Push Drizzle schema to DB
pnpm db:seed                                  # Seed sample data
```

Schema at `src/db/schema.ts`, config at `drizzle.config.ts`. Connection string from `DATABASE_URL` env var.

## Project Structure

```
src/
  app/                  # Next.js App Router pages and API routes
    (kid)/              # Route group for kid-facing pages (shared layout)
    api/                # API routes organized by domain (kebab-case dirs)
  components/           # React components (PascalCase files)
    __tests__/          # Co-located component tests
    admin/              # Admin-specific components
    shared/             # Layout/shared components
    store/              # Store feature components
  contexts/             # React Context providers (PascalCase files)
  db/                   # Drizzle schema, connection, seed
  hooks/                # Custom hooks (camelCase files, use* prefix)
  lib/                  # Pure business logic and utilities (kebab-case files)
    __tests__/          # Co-located lib tests
    voice-providers/    # Voice provider abstraction layer
  test/                 # Vitest global setup
```

## Architecture Notes

- **PWA**: Configured via `public/manifest.json`, apple-touch-icon, viewport meta. Mobile-first design targeting iPad/tablet.
- **Context providers**: `RootLayout` wraps the app in `ThemeProvider` > `KidContextProvider`. Pages under `(kid)/` share a layout with `Header` + `BottomNav` and have access to kid context.
- **Fonts**: Plus Jakarta Sans (headings/UI) and Be Vietnam Pro (body) via `next/font/google`. Icons use Material Symbols Outlined loaded from Google Fonts CDN (not an npm icon library) -- render with `<span className="material-symbols-outlined">icon_name</span>`.
- **AI features**: Chat via AI SDK with OpenRouter or Ollama providers. Voice assistant uses a provider abstraction layer (`src/lib/voice-providers/`) supporting Web Speech API, ElevenLabs, and AWS Bedrock.

## Code Style

### Formatting

- **2-space indentation**, no tabs
- **Semicolons** always
- **Single quotes** in TS/JS; **double quotes** in JSX attributes
- **Trailing commas** in all multi-line structures (objects, arrays, params, imports)
- No blank lines between import groups

### Imports

Order: external packages, then `@/` alias imports, then relative imports (rare).

```typescript
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { kids } from '@/db/schema';
import { formatDate } from '@/lib/date-utils';
```

- **Always use `@/`** for cross-directory imports (`@/` maps to `src/`)
- **Relative paths** only in test files importing the subject under test (`'../route'`)
- **`import type`** for type-only imports: `import type { Metadata } from 'next'`
- **Inline `type` keyword** when mixing values and types: `import { useKid, type Kid } from '@/contexts/KidContext'`

### TypeScript

- `strict: true` in tsconfig -- no implicit any, strict null checks
- **`interface`** for object shapes (props, context values, data records)
- **`type`** only for unions, Zod inferred types, callbacks, and utility types
- **Never use `any`** -- use `unknown` for untyped data, `Record<string, unknown>` for dynamic objects
- **`readonly` arrays** for function parameters that should not be mutated
- Explicit generics on `useState` when type cannot be inferred: `useState<Kid | null>(null)`
- Zod schemas for all external input validation; infer types with `z.infer<typeof schema>`

### Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ChoreGrid`, `AllowanceCard` |
| Component files | PascalCase.tsx | `ChoreGrid.tsx` |
| Hooks | camelCase with `use` prefix | `useChoreGrid` |
| Hook files | camelCase.ts | `useChoreGrid.ts` |
| Lib/utility files | kebab-case.ts | `date-utils.ts`, `allowance-engine.ts` |
| Context files | PascalCase.tsx | `KidContext.tsx` |
| API route dirs | kebab-case | `voice-settings/`, `savings-goals/` |
| Module constants | UPPER_SNAKE_CASE | `DAY_LABELS`, `STORAGE_KEY` |
| Variables/functions | camelCase | `selectedKid`, `handleToggle` |
| Interfaces | PascalCase | `ChoreGridProps`, `UseChoreGridResult` |
| Props interfaces | `<ComponentName>Props` | `HeaderProps`, `AllowanceCardProps` |
| Callback props | `on` prefix | `onToggle`, `onSelectKid` |
| Zod schemas | camelCase + Schema suffix | `createKidSchema` |

### React Components

- **Named `function` declarations** (not arrow functions): `export function ChoreGrid({ ... }: ChoreGridProps) {`
- **Named exports** for all components; `export default` only for pages and layouts
- Props destructured in function signature
- `'use client'` directive at line 1 for every client component and hook
- Always set `type="button"` on non-submit `<button>` elements
- Use `data-testid` attributes for test targeting
- `useCallback` for all event handlers passed as props; `useMemo` for derived values
- Async effects use a `cancelled` flag pattern for cleanup:
  ```typescript
  useEffect(() => {
    let cancelled = false;
    async function load() { ... if (cancelled) return; setState(data); }
    load();
    return () => { cancelled = true; };
  }, [dep]);
  ```

### API Routes

- Explicit return type `Promise<NextResponse>` on all handlers
- Parse body as `const body: unknown = await request.json()` then validate with Zod
- Section comments to separate HTTP methods: `// --- GET /api/savings-goals?kidId=X ---`
- Status codes: 200 (success), 201 (created), 400 (validation), 404 (not found), 500 (server error)
- Error response shape: `{ error: string }` or `{ error: string, details: Record<string, string[]> }`
- Drizzle `numeric` columns return strings: convert at API boundary with `Number()` on read, `String()` on write

### Error Handling

- Top-level try/catch in every API route handler
- Always annotate catch: `catch (error: unknown)`
- Check for ZodError: `if (error instanceof ZodError)` -> 400
- Log with context: `console.error('Failed to create kid:', error)`
- Components wrapped in `<ErrorBoundary>` at section level
- Context guard hooks: `if (!ctx) throw new Error('useKid must be used within KidContextProvider')`
- Empty catch blocks only for truly ignorable failures (e.g., sessionStorage unavailable)

### Database / Drizzle

- Schema uses camelCase TS properties mapped to snake_case DB columns: `kidId: uuid('kid_id')`
- UUIDs as primary keys with `.defaultRandom()`
- Timestamps with timezone: `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
- Foreign keys with cascade deletes: `.references(() => kids.id, { onDelete: 'cascade' })`
- Two query styles: relational `db.query.table.findMany({...})` and builder `db.select().from(table).where(...)`
- Inserts destructure the returning array: `const [created] = await db.insert(table).values(data).returning()`

### Styling

- **Tailwind CSS v4** -- configured via CSS (`globals.css` `@theme` block), no `tailwind.config.ts`
- Design tokens as CSS custom properties in `:root` and `@theme`
- Dynamic theming via `style={{ backgroundColor: 'var(--primary-container)' }}`
- Global utility classes for glassmorphism: `.glass-panel`, `.glass-card`, `.glass-nav`
- Custom animations: `.animate-pop`, `.animate-shake`, `.animate-card-entrance`
- Theme variants via `data-*` attributes: `[data-theme="dark"]`, `[data-kid-theme="teal"]`
- No CSS modules -- Tailwind utilities and CSS custom properties only
- Design system constants in `src/lib/design-system.ts` with `as const`

## Testing Conventions

- **Vitest** with jsdom environment, globals enabled
- **@testing-library/react** + **jest-dom** for component tests
- **fast-check** for property-based tests (used extensively)
- Tests in `__tests__/` directories co-located with source code
- Unit tests: `<subject>.test.ts`; property tests: `<subject>.property.test.ts`
- `describe` blocks for grouping; `test` or `it` for individual cases
- Mock modules with `vi.mock()` factory pattern; mock fetch with `global.fetch = vi.fn()`
- Property tests set explicit `numRuns` (100 for logic, 10 for UI)
- Property test labels reference feature requirements: `// Feature: allowance-gamification-ui, Property 17`
- Helper factories for test data: `function createRequest(...)`, `function makeKid(...)`
- Call `unmount()` after each property iteration in component property tests

## Verifying UI Changes with Playwright MCP

A Playwright MCP server is available for browser-based verification. **After making frontend changes, use it to confirm your work** -- don't rely solely on unit tests for UI correctness.

### When to use it

- **Styling/layout changes**: Navigate to the affected page, take a snapshot or screenshot, and confirm the visual result matches intent.
- **Behavior changes**: Interact with the page (click buttons, fill forms, toggle chores) to verify the feature works end-to-end.
- **Both** when a change touches styling and behavior (e.g., a new component with interactions).

### How

1. Ensure the dev server is running (`pnpm dev` on `http://localhost:3000`)
2. Use `browser_navigate` to open the relevant page (e.g., `http://localhost:3000/dashboard`)
3. Use `browser_snapshot` (preferred over screenshot) to inspect the accessibility tree and confirm elements render correctly
4. For interactive verification: use `browser_click`, `browser_type`, `browser_fill_form` etc. to exercise the feature, then snapshot again to confirm the resulting state
5. If verifying multiple kid themes or dark mode, switch themes via the UI and re-check
