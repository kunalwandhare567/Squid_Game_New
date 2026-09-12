# 🦑 IAE Squid Game: Red Light, Green Light (AI Quiz Edition)

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> A high-stakes, real-time multiplayer AI trivia battle inspired by *Squid Game's "Red Light, Green Light"*. Built for live interactive events, hackathons, and classroom competitions.

---

## 🎮 Overview

**IAE Squid Game** transforms standard trivia into an adrenaline-pumping survival game. Players scan a dynamically generated QR code on the host's projector screen to join a live room. During each round, questions flash on the screen as players race against the clock to lock in their answers before the timer runs out. 

Wrong answers or running out of time during **Red Light** result in instant elimination! Surviving players advance until the final victor claims the grand prize on the champion podium.

---

## ✨ Key Features

- 📺 **Host & Projector Screen (`?host=true`)**:
  - Full-screen real-time dashboard designed for stage projectors and big displays.
  - Live player lobby with dynamic 4-letter room codes & QR code generation.
  - Automated or manual game loop control (Start Game, Question Countdown, Answer Reveal, Leaderboard/Podium).
  - Cinematic Squid Game visual effects, countdown timers, and animated transitions.

- 📱 **Mobile-Optimized Player Interface (`?room=ABCD`)**:
  - Frictionless join flow: scan the QR code or enter a 4-letter room code with a nickname.
  - Instant tactile feedback for answer submission.
  - Real-time verdict screens (Pass, Eliminated, Revival).
  - Spectator mode for eliminated players so they can continue following the live game.

- 🧠 **150+ Curated AI & Tech Questions**:
  - Built-in comprehensive question bank spanning:
    - **Basic AI & Machine Learning**
    - **Generative AI & Large Language Models (LLMs)**
    - **AI Ethics & Safety**
    - **Cloud, Systems & Modern Tech**
  - Includes full explanations ("Why?") shown after every round.

- ⚡ **Real-Time Synchronization**:
  - Powered by **Supabase Realtime (PostgreSQL)** for sub-second synchronization between Host and dozens of concurrent mobile players.

- 🎵 **Procedural Web Audio Synthesizer**:
  - Built-in sound engine powered by the Web Audio API (no external sound file dependencies required).
  - Custom 8-bit / arcade sounds for countdown beeps, correct chimes, elimination buzzer, suspense drone, and victory fanfare.

- 🔄 **Revival & Elimination Mechanics**:
  - High-intensity survival rules engine with customizable elimination thresholds.
  - Sudden-death revival rounds to give eliminated players one last chance to rejoin.

- 🏆 **Podium & Confetti Celebration**:
  - Dynamic victory ceremony featuring gold, silver, and bronze rankings with celebratory confetti particle animations.

---

## 🛠️ Tech Stack & Requirements

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite |
| **Styling** | Custom Vanilla CSS (Dark Cyberpunk / Squid Game Neon aesthetic) |
| **Realtime Backend** | Supabase (PostgreSQL + Realtime Channels) |
| **Icons** | Lucide React |
| **QR Code Engine** | `qrcode.react` |
| **Visual Effects** | `canvas-confetti` |
| **Audio** | Native HTML5 Web Audio API Synth Engine |
| **Deployment** | Netlify / Vercel / Cloudflare Pages |

---

## 🗄️ Supabase Database Setup

Run this SQL snippet in your **Supabase Project -> SQL Editor**:

```sql
-- 1. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    room_code TEXT PRIMARY KEY,
    phase TEXT DEFAULT 'lobby',
    q_index INT DEFAULT 0,
    question JSONB DEFAULT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Players table
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

-- 3. Answers table
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

-- 4. Enable Row Level Security (RLS) policies for multiplayer access
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public all on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public all on players" ON players FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read on answers" ON answers FOR SELECT USING (true);
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
git clone https://github.com/kunalwandhare567/Squid_game.git
cd Squid_game/squid-game-react
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create `.env` inside `squid-game-react/`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎯 How to Play

### Host Workflow
1. Open `http://localhost:5173?host=true` on your main display.
2. A unique 4-letter Room Code and QR Code will be generated.
3. Wait for players to join the lobby.
4. Click **Start Game** to trigger the countdown and begin Round 1.
5. Control question pacing, reveal answers, view eliminations, and crown the winner on the podium!

### Player Workflow
1. Scan the QR code displayed on the host screen, or visit the URL and enter the 4-letter Room Code.
2. Enter your nickname and avatar.
3. When the question begins (**Green Light**), choose your answer before time runs out.
4. If you answer correctly, you advance. If eliminated, fight for survival in the Revival Round!

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
  