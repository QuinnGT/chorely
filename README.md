# Chorely

Chorely is a mobile-first family chore, allowance, savings, and reward-store app built as a Next.js PWA. Kids get a playful dashboard for finishing chores and tracking money. Parents get a PIN-protected admin area for managing kids, chores, allowance rules, store inventory, orders, voice settings, and themes.

<p>
  <a href="https://nextjs.org"><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black"></a>
  <a href="https://react.dev"><img alt="React 19" src="https://img.shields.io/badge/React-19-149eca"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178c6"></a>
  <a href="https://orm.drizzle.team"><img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle-PostgreSQL-c5f74f"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

<a href="public/app-screenshots/frontend/kids-dashboard.png">
  <img src="public/app-screenshots/frontend/kids-dashboard.png" alt="Chorely kid dashboard showing chores, wallet, weekly goal, streaks, and achievements" width="100%">
</a>

## Highlights

- Kid profiles with custom color themes, uploaded avatars, and optional AI-generated avatars.
- Daily and weekly chore grids with streaks, progress rings, achievements, and a full-screen celebration when daily chores are complete.
- "Big Boss" weekly chores with descriptions and bonus reward amounts.
- Allowance tracking with base earnings, streak bonuses, paid history, and per-kid allowance rules.
- Save, Spend, Give money jars with configurable allocation percentages.
- Savings goals with contributions, withdrawals, and store-item goal creation when kids are short on funds.
- Reward store with categories, stock, order approvals, custom currency settings, uploaded images, and optional AI-generated item images.
- Optional AI chat and voice assistant using OpenRouter, Ollama, Web Speech API, ElevenLabs, and a voice-provider abstraction.
- Docker-first deployment with automatic schema push and admin PIN sync at startup.

## Screenshots

Click any screenshot to open the full-resolution image.

### Kid App

<table>
  <tr>
    <td width="50%">
      <a href="public/app-screenshots/frontend/kids-dashboard.png">
        <img src="public/app-screenshots/frontend/kids-dashboard.png" alt="Kids dashboard" width="100%">
      </a>
      <strong>Dashboard</strong>
    </td>
    <td width="50%">
      <a href="public/app-screenshots/frontend/kids-goals.png">
        <img src="public/app-screenshots/frontend/kids-goals.png" alt="Kids savings goals and jars" width="100%">
      </a>
      <strong>Savings Goals</strong>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <a href="public/app-screenshots/frontend/kids-store.png">
        <img src="public/app-screenshots/frontend/kids-store.png" alt="Kids reward store" width="100%">
      </a>
      <strong>Reward Store</strong>
    </td>
    <td width="50%">
      <a href="public/app-screenshots/frontend/kids-weekly-summary.png">
        <img src="public/app-screenshots/frontend/kids-weekly-summary.png" alt="Kids weekly summary" width="100%">
      </a>
      <strong>Weekly Summary</strong>
    </td>
  </tr>
</table>

### Parent Admin

<table>
  <tr>
    <td width="50%">
      <a href="public/app-screenshots/admin/family-admin-kid-management.png">
        <img src="public/app-screenshots/admin/family-admin-kid-management.png" alt="Family admin kid management" width="100%">
      </a>
      <strong>Kid Management</strong>
    </td>
    <td width="50%">
      <a href="public/app-screenshots/admin/family-admin-chore-manager.png">
        <img src="public/app-screenshots/admin/family-admin-chore-manager.png" alt="Family admin chore manager" width="100%">
      </a>
      <strong>Chore Manager</strong>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <a href="public/app-screenshots/admin/family-admin-allowance-manager.png">
        <img src="public/app-screenshots/admin/family-admin-allowance-manager.png" alt="Family admin allowance manager" width="100%">
      </a>
      <strong>Allowance Rules</strong>
    </td>
    <td width="50%">
      <a href="public/app-screenshots/admin/family-admin-themes.png">
        <img src="public/app-screenshots/admin/family-admin-themes.png" alt="Family admin themes" width="100%">
      </a>
      <strong>Themes</strong>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <a href="public/app-screenshots/admin/family-admin-voice.png">
        <img src="public/app-screenshots/admin/family-admin-voice.png" alt="Family admin voice settings" width="100%">
      </a>
      <strong>Voice Settings</strong>
    </td>
    <td width="50%">
      <a href="public/app-screenshots/admin/family-admin-store.png">
        <img src="public/app-screenshots/admin/family-admin-store.png" alt="Family admin store settings" width="100%">
      </a>
      <strong>Store Admin</strong>
    </td>
  </tr>
</table>

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript strict mode |
| Database | PostgreSQL 17, Drizzle ORM |
| Styling | Tailwind CSS v4, CSS custom properties |
| AI | Vercel AI SDK, OpenRouter, Ollama, Mem0 optional memory |
| Voice | Web Speech API, ElevenLabs, AWS Bedrock-ready settings |
| Validation | Zod |
| Testing | Vitest, Testing Library, fast-check |
| Package manager | pnpm 10 |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) for local PostgreSQL, or your own PostgreSQL database

### Local Development

```sh
git clone https://github.com/QuinnGT/chorely.git
cd chorely
pnpm install
cp .env.example .env.local
docker compose up -d db
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The seed command creates demo kids, chores, allowance data, savings goals, store items, and the default admin PIN from `DEFAULT_ADMIN_PIN`.

Only run `pnpm db:seed` on a new or disposable database. It clears existing Chorely data before creating demo records.

## Deployment

### Option 1: Docker Compose

This is the easiest self-hosted path because the app container pushes the Drizzle schema and syncs the admin PIN every time it starts.

```sh
cp .env.example .env
docker compose --profile full up --build
```

Then open [http://localhost:3000](http://localhost:3000). PostgreSQL runs as the `db` service, and app data is stored in the `pgdata` Docker volume.

For a real deployment, set at least these values in `.env` before starting:

```env
DEFAULT_ADMIN_PIN=change-this-pin
OPENROUTER_API_KEY=
ELEVENLABS_API_KEY=
```

`DATABASE_URL` is set automatically inside Docker Compose so the app can reach the `db` service. Optional AI and voice variables can be left blank.

### Option 2: Bring Your Own PostgreSQL

Use this flow for platforms such as Vercel, Render, Railway, Fly.io, or any Node host.

1. Provision a PostgreSQL database.
2. Set `DATABASE_URL` and `DEFAULT_ADMIN_PIN` in the host's environment settings.
3. Set optional AI and voice keys if you want those features enabled.
4. Build with `pnpm build`.
5. Before the first app start, run:

```sh
pnpm db:push
pnpm db:admin-pin
```

For Vercel-style workflows, pull or create a local `.env.local` containing the production `DATABASE_URL`, then run the two commands above from your machine or CI. Run `pnpm db:seed` only if you intentionally want demo data in that database.

### Production Start

```sh
pnpm build
pnpm start
```

The Next.js config uses standalone output, so the included Dockerfile can run a smaller production image.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Local default: `postgresql://chorely:chorely@localhost:5432/chorely` |
| `DEFAULT_ADMIN_PIN` | Yes | Parent admin PIN. Seeded by `pnpm db:seed`, `pnpm db:admin-pin`, or the Docker entrypoint. |
| `ADMIN_PIN_SESSION_TIMEOUT_MINUTES` | No | Minutes before parent admin access requires the PIN again. Defaults to `5`. |
| `OPENROUTER_API_KEY` | No | Enables OpenRouter chat and AI image generation. |
| `OLLAMA_BASE_URL` | No | Local Ollama endpoint. Defaults to `http://localhost:11434`; Docker Compose defaults to `http://host.docker.internal:11434`. |
| `AVATAR_MODEL` | No | Quality image model for generated avatars and store images. |
| `AVATAR_MODEL_FAST` | No | Faster image model for generated avatars and store images. |
| `ELEVENLABS_API_KEY` | No | Premium text-to-speech voices and voice list lookup. |
| `AWS_ACCESS_KEY_ID` | No | AWS Bedrock voice-provider configuration. |
| `AWS_SECRET_ACCESS_KEY` | No | AWS Bedrock voice-provider configuration. |
| `AWS_REGION` | No | AWS Bedrock voice-provider configuration. |

The app runs with only `DATABASE_URL` and `DEFAULT_ADMIN_PIN`. AI, generated images, memory, and premium voice features degrade gracefully when their keys are missing.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Build the production app. |
| `pnpm start` | Start the production server. |
| `pnpm lint` | Run ESLint. |
| `pnpm test` | Run Vitest once. |
| `pnpm db:push` | Push the Drizzle schema to the configured database. |
| `pnpm db:seed` | Reset and seed demo data. |
| `pnpm db:admin-pin` | Upsert `DEFAULT_ADMIN_PIN` into `app_settings`. |

## Project Structure

```text
src/
  app/                  Pages and API routes
    (kid)/              Kid-facing dashboard, earnings, goals, and store
    admin/              PIN-protected parent admin area
    api/                API routes by domain
  components/           Shared, kid, admin, and store UI components
  contexts/             React context providers
  db/                   Drizzle schema, database client, and seed data
  hooks/                Client data hooks
  lib/                  Business logic, validation, AI, image, and voice helpers
public/
  app-screenshots/      README screenshots
  icons/                PWA icons
scripts/
  seed-admin-pin.mjs    Admin PIN sync helper
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `PIN not configured` in the admin panel | Set `DEFAULT_ADMIN_PIN`, then run `pnpm db:admin-pin`. Docker Compose does this automatically when the variable is present. |
| `DATABASE_URL` connection errors | Confirm PostgreSQL is running and that `.env.local` points at the right database. For local Docker DBs, use `docker compose up -d db`. |
| AI chat or image generation is unavailable | Add `OPENROUTER_API_KEY`. Ollama can be used for chat when `OLLAMA_BASE_URL` is reachable. |
| ElevenLabs voices do not load | Add `ELEVENLABS_API_KEY` and restart the app. |
| Docker app cannot reach Ollama | Use `OLLAMA_BASE_URL=http://host.docker.internal:11434` or a network-reachable Ollama host. |

## Contributing

Chorely is open source under the [MIT License](LICENSE). Contributions are welcome.

1. Fork the repo.
2. Create a branch: `git checkout -b feature/my-feature`.
3. Make your changes.
4. Run `pnpm lint` and `pnpm test`.
5. Open a pull request.

## License

[MIT](LICENSE)
