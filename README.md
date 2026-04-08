# Chorely

A family chore and allowance management app that makes household responsibilities fun for kids. Built as a mobile-first PWA for tablets and phones.

Kids pick their profile, check off daily chores, earn allowance, save toward goals, and spend coins in a reward store. Parents manage everything from a PIN-protected admin panel. An optional AI assistant helps kids stay on track with voice and chat.

## Features

### For Kids

- **Chore Dashboard** -- Weekly chore grid with daily checkboxes, progress ring, and streak counter. Chores are split into Main (daily) and Bonus (weekly) tabs.
- **Celebrations** -- Full-screen confetti overlay when all daily chores are done. Plays once per day with trophy animation, bonus tokens, and a streak callout.
- **Earnings Tracker** -- Weekly summaries, base vs. bonus breakdown, earning history timeline, and achievement badges (First Chore, Full Day, Full Week, 7/14/30-Day Streaks).
- **Savings Goals** -- Set goals for things you want. Progress bars track how close you are.
- **Money Jars** -- Spending categories (Save, Spend, Give) with configurable percentage splits and visual fill-level jars.
- **Reward Store** -- Browse items by category (Toys, Games, Experiences, Books). Redeem with earned coins or add items to savings goals if you're short.
- **AI Chat** -- Slide-out chat panel with a friendly assistant that knows your chores, allowance, and goals. Can mark chores done and create savings goals by conversation.
- **Voice Assistant** -- Tap-to-speak mic button on the dashboard. Supports Web Speech API (free), ElevenLabs (premium TTS), and AWS Bedrock (planned).

### For Parents

- **PIN-Protected Admin** -- 4-digit keypad entry with on-screen buttons. Session persists until the browser tab closes.
- **Kid Management** -- Add kids with names, avatar photos, and theme colors. Each kid gets their own color scheme across the app.
- **Chore Management** -- Create chores with emoji icons, set frequency (daily/weekly), and assign to one or more kids.
- **Allowance Rules** -- Per-kid amounts for full completion, partial completion, and streak bonuses. Configure minimum streak days.
- **Store Admin** -- Manage inventory (items, prices, stock, categories), review orders (pending/approved/shipped/delivered), and configure store settings.
- **Voice Settings** -- Per-kid voice config: wake phrase, provider selection, speech output, sound effects. Test voice button.
- **Themes** -- Light/dark mode, 4 preset color themes, and a custom color picker with live preview.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Database | PostgreSQL 17, Drizzle ORM |
| Styling | Tailwind CSS v4, CSS custom properties |
| AI | Vercel AI SDK, OpenRouter, Ollama |
| Voice | Web Speech API, ElevenLabs, AWS Bedrock (planned) |
| Validation | Zod |
| Testing | Vitest, Testing Library, fast-check |
| Package Manager | pnpm |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for PostgreSQL, or bring your own)

### 1. Clone and install

```sh
git clone https://github.com/your-username/chorely.git
cd chorely
pnpm install
```

### 2. Start the database

```sh
docker compose up db
```

This starts PostgreSQL 17 on port 5432.

### 3. Configure environment

```sh
cp .env.example .env
```

Edit `.env` with your database connection string. The defaults work with the Docker Compose setup:

```
DATABASE_URL=postgresql://chorely:chorely@localhost:5432/chorely
DEFAULT_ADMIN_PIN=1234
```

All other variables are optional. See [Environment Variables](#environment-variables) below.

### 4. Push the schema and seed

```sh
pnpm db:push
pnpm db:seed
```

### 5. Run the dev server

```sh
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a kid profile and start checking off chores.

## Deployment

### Docker (recommended)

The full stack runs with Docker Compose:

```sh
docker compose --profile full up
```

This starts both PostgreSQL and the Next.js app on port 3000. The app uses a multi-stage Docker build with standalone Next.js output and runs as a non-root user.

### Manual

```sh
pnpm build
pnpm start
```

You'll need to provide your own PostgreSQL instance via `DATABASE_URL`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DEFAULT_ADMIN_PIN` | Yes | PIN for the parent admin panel (default: `1234`) |
| `OPENROUTER_API_KEY` | No | AI chat via OpenRouter cloud models |
| `OLLAMA_BASE_URL` | No | Local AI via Ollama (default: `http://localhost:11434`) |
| `MEM0_API_KEY` | No | Conversation memory for the AI assistant |
| `ELEVENLABS_API_KEY` | No | Premium text-to-speech voices |
| `AWS_ACCESS_KEY_ID` | No | AWS Bedrock voice provider |
| `AWS_SECRET_ACCESS_KEY` | No | AWS Bedrock voice provider |
| `AWS_REGION` | No | AWS Bedrock voice provider |

The app works with just `DATABASE_URL` and `DEFAULT_ADMIN_PIN`. AI, voice, and memory features degrade gracefully when their keys aren't set.

## Scripts

```sh
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run all tests
pnpm db:push      # Push Drizzle schema to database
pnpm db:seed      # Seed sample data
```

## Project Structure

```
src/
  app/                  # Pages and API routes (App Router)
    (kid)/              # Kid-facing pages (dashboard, earnings, goals, store)
    admin/              # Parent admin pages
    api/                # API routes by domain
  components/           # React components
    admin/              # Admin-specific components
    shared/             # Layout and shared components
    store/              # Store feature components
  contexts/             # React Context providers
  db/                   # Drizzle schema, connection, seed
  hooks/                # Custom React hooks
  lib/                  # Business logic and utilities
    voice-providers/    # Voice provider abstraction layer
```

## Vision

Chorely started as a chore tracker but the goal is a family home base -- one app for the day-to-day stuff families need to coordinate.

**Current focus:**
- Chore management with gamification (streaks, badges, celebrations)
- Allowance tracking with Save/Spend/Give money jars
- Reward store where kids spend what they earn
- AI assistant that understands each kid's context

**On the roadmap:**
- Family calendar with shared events and reminders
- Meal planning and grocery lists
- Recurring schedules and routines
- Multi-family / household support
- Native mobile apps (iOS, Android)

## Contributing

Chorely is open source under the [MIT License](LICENSE). Contributions are welcome.

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `pnpm lint` and `pnpm test`
5. Open a pull request

## License

[MIT](LICENSE)
