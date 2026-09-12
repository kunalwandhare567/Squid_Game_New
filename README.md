# 🦑 IAE Squid Game: Red Light, Green Light (AI Quiz Edition)

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
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
  - Powered by **Firebase Realtime Database** for sub-second synchronization between Host and dozens of concurrent mobile players.

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
| **Realtime Backend** | Firebase Realtime Database |
| **Icons** | Lucide React |
| **QR Code Engine** | `qrcode.react` |
| **Visual Effects** | `canvas-confetti` |
| **Audio** | Native HTML5 Web Audio API Synth Engine |
| **Deployment** | Netlify / Vercel / Firebase Hosting |

### System Requirements
- **Node.js**: `v18.0.0` or higher (Node `v20+` recommended)
- **npm**: `v9.0.0` or higher (or `yarn` / `pnpm`)
- Modern web browser (Chrome, Edge, Safari, Firefox) with Web Audio and JavaScript enabled.

---

## 📁 Repository Structure

```text
Squid_game/
├── README.md                      # Workspace & Project documentation
├── .gitignore                     # Git ignore rules for root
├── vid/                           # Demonstration recordings and assets
│   └── vid1.mp4
└── squid-game-react/              # React frontend application
    ├── index.html                 # App entry HTML
    ├── vite.config.js             # Vite build configuration
    ├── package.json               # Dependencies and scripts
    ├── netlify.toml               # Netlify SPA redirect & deployment config
    ├── .env.example               # Firebase environment variable template
    ├── .gitignore                 # React app gitignore
    ├── public/                    # Static public assets
    └── src/
        ├── App.jsx                # Main URL router (?host=true / ?room=ABCD)
        ├── main.jsx               # React DOM root
        ├── index.css              # Global styles & design system
        ├── firebase.js            # Firebase client initialization
        ├── audio/
        │   └── soundEngine.js     # Web Audio API procedural sound synthesizer
        ├── context/
        │   └── AudioContext.jsx   # Sound state management provider
        ├── data/
        │   └── questions.js       # 150+ curated AI trivia questions
        ├── hooks/
        │   └── usePlayerSession.js# LocalStorage & Firebase session hook
        ├── utils/
        │   └── ruleEngine.js      # Game state transitions & score calculation
        └── components/
            ├── Host/              # Host projector screens
            │   ├── HostApp.jsx
            │   ├── HostLobby.jsx
            │   ├── HostQuestion.jsx
            │   ├── HostReveal.jsx
            │   ├── HostRevival.jsx
            │   └── HostPodium.jsx
            ├── Player/            # Mobile player screens
            │   ├── PlayerApp.jsx
            │   ├── PlayerJoin.jsx
            │   ├── PlayerWait.jsx
            │   ├── PlayerAnswer.jsx
            │   ├── PlayerVerdict.jsx
            │   ├── PlayerRevival.jsx
            │   ├── PlayerSpectate.jsx
            │   └── PlayerEnd.jsx
            └── Shared/            # Reusable UI widgets (QRDisplay, etc.)
                └── QRDisplay.jsx
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

### 3. Setup Firebase Realtime Database

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Build**, select **Realtime Database** and click **Create Database**.
3. Set your Realtime Database Security Rules for public read/write during development:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
4. Copy your web app's Firebase credentials into a new `.env` file inside `squid-game-react/`:

```bash
cp .env.example .env
```

5. Fill in your `.env` variables:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎯 How to Play

### Host Workflow
1. Open `http://localhost:5173?host=true` on your main laptop/projector display.
2. A unique 4-letter Room Code (e.g. `SQUID`) and QR Code will be generated automatically.
3. Wait for players to join the lobby.
4. Click **Start Game** to trigger the countdown and begin Round 1.
5. Control question pacing, reveal answers, view eliminations, and crown the winner on the podium!

### Player Workflow
1. Scan the QR code displayed on the host screen, or visit `http://localhost:5173` and enter the 4-letter Room Code.
2. Enter your nickname and avatar.
3. When the question begins (**Green Light**), choose your answer before time runs out.
4. If you answer correctly, you advance to the next round. If incorrect, you enter Spectator mode or fight for survival in the Revival Round.

---

## 🌐 Production Deployment

### Deploy on Netlify (Recommended)
This repository includes a [`netlify.toml`](squid-game-react/netlify.toml) configured for single-page routing:
1. Connect your GitHub repository to [Netlify](https://www.netlify.com/).
2. Set the **Base directory** to `squid-game-react`.
3. Set the **Build command** to `npm run build`.
4. Set the **Publish directory** to `squid-game-react/dist`.
5. Add your `VITE_FIREBASE_*` environment variables in the Netlify dashboard under **Site configuration > Environment variables**.

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
