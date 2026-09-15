# 🦑 Squid Game React Web App

> Frontend client for **IAE Squid Game (Red Light, Green Light AI Quiz Edition)**.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
# Create .env and provide your Supabase project credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build
```

## 🛠️ Available Scripts

- `npm run dev`: Starts the Vite local development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles and bundles production assets into `dist/`.
- `npm run preview`: Previews the local production build.
- `npm run lint`: Runs code inspections.

## 🌟 Key Features

- **12s Question Countdown**: 7s solid green light + 5s rapid amber/red blinking warning.
- **Sub-Second Response Tracking**: Accurate response speed in milliseconds (`speedMs`), average response time display, and speed-based tiebreaking.
- **Supabase Realtime Sync**: Sub-second synchronization between Host projector screen and all mobile player clients.
- **Procedural Web Audio**: Built-in sound synthesis with zero external audio assets.
- **Podium & Scorecards**: 3D celebratory podium for Host and personalized responsive scorecards for players.

For complete system architecture, database setup, and gameplay rules, refer to the [Root README.md](../README.md).
