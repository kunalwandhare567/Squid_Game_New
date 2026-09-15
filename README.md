# 🦑 IAE Squid Game: Red Light, Green Light (AI Quiz Edition)

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> A high-stakes, real-time multiplayer AI trivia battle inspired by *Squid Game's "Red Light, Green Light"*. Built for live interactive expos, tech hackathons, and classroom competitions.

---

## 🎮 Overview

**IAE Squid Game** transforms trivia competitions into an interactive survival tournament. Players scan a dynamically generated QR code on the host's screen or projector to enter a live multiplayer lobby. During each round, questions flash on the screen as players race against the clock to lock in their answers before the timer runs out.

Wrong answers or failing to lock in before **Red Light** drops cause strikes. 3 consecutive strikes result in permanent elimination! Surviving players advance across 10 rounds until the final champion is crowned on the podium.

---

## ✨ Key Features & Gameplay Mechanics

- ⏱️ **12-Second High-Tension Round Loop**:
  - **0s – 7s**: Solid **Green Light** — contestants read the question and tap their answer.
  - **7s – 12s (5 seconds)**: Escalating **Blinking Warning** — rapid amber/red flickers with accelerating procedural synth heartbeat.
  - **12s Mark**: **Hard Stop / Red Light** — answers lock immediately; unanswered players receive a strike.

- ⚡ **Precision Response Time in Milliseconds (ms)**:
  - Exact response speed is tracked in milliseconds for every contestant on every round (`speedMs = submittedAt - greenStartAt`).
  - Displays formatted average response times (e.g., `⚡ 2.45s avg (2450ms)`) on the Host podium and personal Player Scorecards.
  - Primary tiebreaker: If players tie on points, the player with the faster average response time wins!

- 🏆 **Authoritative Winner Determination & Dynamic Ranking**:
  1. **Survival Status**: Alive survivors always rank higher than eliminated contestants.
  2. **Total Score**: Higher accumulated points.
  3. **Response Speed**: Fastest cumulative and average response time in ms (lower ms wins).
  4. **Fewest Strikes**: Lowest consecutive wrong answers.
  5. **Join Order**: Earliest room entry tiebreaker.

- 📺 **Host & Projector Screen (`?host=true`)**:
  - Full-screen cinematic dashboard designed for stage projectors and large displays.
  - Dynamic 4-letter Room Code generation with integrated QR code for instant mobile joins.
  - 15-player live grid showing joined players, ready status, and AI bot fillers.
  - Automated question timer, animated answer reveal, dynamic live scoreboard track, and 3D celebratory podium with confetti.

- 📱 **Mobile Player Interface (`?room=ABCD`)**:
  - Seamless mobile UI with randomized option layouts to prevent screen peeking.
  - Haptic-feel instant button feedback, countdown timer rings, and strike alert banners.
  - Post-match personalized scorecard with rank tiers (Gold, Silver, Bronze, Top 5, Survivor), correct answer tallies, and expandable full leaderboard drawer.

- 🔒 **Fair Play & Anti-Cheat System**:
  - `correctId` is hidden from the room document until the Host triggers the reveal phase.
  - Device completion tracking with 1 match/day policy and Host passkey unlock system.

- 🧠 **Curated AI & Technology Question Bank**:
  - 400+ questions covering Generative AI, Large Language Models (LLMs), Machine Learning fundamentals, AI Ethics, Cloud, and Systems.
  - Comprehensive explanations ("Why?") revealed after every round.

- 🎵 **Procedural Web Audio Engine**:
  - Native HTML5 Web Audio API synthesizer — zero audio file dependencies.
  - Custom 8-bit soundscapes: escalating tempo beat, red light buzzers, elimination cues, victory fanfare, and speech synthesis.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite |
| **Styling** | Custom Vanilla CSS (Dark Cyberpunk / Squid Game Neon aesthetic) |
| **Realtime Database** | Supabase (PostgreSQL + Realtime WebSocket Channels) |
| **Icons** | Lucide React |
| **QR Code Engine** | `qrcode.react` |
| **Visual Effects** | `canvas-confetti` + Ambient CSS Keyframe Animations |
| **Audio Engine** | Web Audio API Synthesizer + Web Speech API |
| **Deployment** | Vercel / Netlify / Cloudflare Pages |

---

## 🗄️ Supabase Database Schema

Execute this SQL schema in your **Supabase Dashboard -> SQL Editor**:

```sql
-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    room_code TEXT PRIMARY KEY,
    phase TEXT DEFAULT 'lobby',
    q_index INT DEFAULT 0,
    question JSONB DEFAULT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Players Table
CREATE TABLE IF NOT EXISTS players (
    room_code TEXT REFERENCES rooms(room_code) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    alive BOOLEAN DEFAULT true,
    spectator BOOLEAN DEFAULT false,
    score INT DEFAULT 0,
    strikes INT DEFAULT 0,
    consecutive_wrong INT DEFAULT 0,
    shield INT DEFAULT 1,
    dd INT DEFAULT 1,
    join_order INT DEFAULT 1,
    bot BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_code, player_id)
);

-- 3. Answers Table
CREATE TABLE IF NOT EXISTS answers (
    room_code TEXT REFERENCES rooms(room_code) ON DELETE CASCADE,
    round_key TEXT NOT NULL,
    player_id TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    shield_on BOOLEAN DEFAULT false,
    dd_on BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_code, round_key, player_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on answers" ON answers FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/kunalwandhare567/Squid_Game_New.git
cd Squid_Game_New/squid-game-react
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in `squid-game-react/`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎯 How to Run a Match

### Host Flow:
1. Open `http://localhost:5173/?host=true` on the stage screen/projector.
2. A unique 4-letter room code and QR code will appear.
3. Wait for players to join (or add AI test bots using the Bot panel).
4. Click **Start Arena** when ready to begin Round 1.
5. Control round reveals, view real-time score progress, and crown the winner on the 3D podium!

### Player Flow:
1. Scan the QR code or enter the 4-letter room code from any mobile browser.
2. Pick a name and avatar.
3. Answer each 12-second question as fast as possible during the green phase.
4. Check your final score, rank, and average response speed on your personal scorecard.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).