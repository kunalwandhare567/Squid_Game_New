// =====================================================================
// soundEngine.js — Web Audio API + Speech Synthesis. No external deps.
// =====================================================================

let ac = null;
let beatTimer = null;
let isMuted = false;
let isVoiceOn = true;
const MOTIF = [659, 622, 587, 523, 587, 622];
let motifIndex = 0;

export function ensureAudioContext() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (ac?.state === 'suspended') ac.resume().catch(() => {});
}

function beep(freq, duration, vol = 0.14, type = 'sine') {
  if (!ac || isMuted) return;
  try {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type           = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch (e) {}
}

export function sfxCorrect() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.16, 0.16, 'triangle'), i * 90));
}

export function sfxWrong() {
  [330, 247].forEach((f, i) => setTimeout(() => beep(f, 0.22, 0.18, 'sawtooth'), i * 110));
}

export function sfxEliminated() {
  [330, 247, 196].forEach((f, i) => setTimeout(() => beep(f, 0.28, 0.20, 'sawtooth'), i * 130));
}

export function sfxRedLight() {
  beep(150, 0.4, 0.22, 'sawtooth');
  setTimeout(() => beep(120, 0.3, 0.18, 'sawtooth'), 180);
}

export function sfxFakeFlicker() {
  beep(200, 0.08, 0.10, 'sawtooth');
}

export function sfxTap() {
  beep(1300, 0.04, 0.06, 'sine');
}

export function sfxRevival() {
  [440, 523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 0.14, 'triangle'), i * 80));
}

export function sfxWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => beep(f, 0.3, 0.2, 'triangle'), i * 120));
}

export function startBeat(windowMs = 10000) {
  stopBeat();
  motifIndex = 0;
  const startTime = Date.now();

  const step = () => {
    if (isMuted) return;
    const t = Math.min(1, (Date.now() - startTime) / windowMs);
    beep(MOTIF[motifIndex % MOTIF.length] * (1 + t * 0.12), 0.16, 0.12, 'triangle');
    motifIndex++;
    // Tempo accelerates as time runs out — builds crowd tension
    const interval = Math.max(120, 420 - t * 300);
    beatTimer = setTimeout(step, interval);
  };
  step();
}

export function stopBeat() {
  if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
}

export function say(text) {
  if (!isVoiceOn || isMuted) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

export function setMuted(val) {
  isMuted = val;
  if (val) { stopBeat(); try { speechSynthesis.cancel(); } catch (e) {} }
}

export function setVoiceOn(val) {
  isVoiceOn = val;
  if (!val) try { speechSynthesis.cancel(); } catch (e) {}
}

export function getMuted()   { return isMuted; }
export function getVoiceOn() { return isVoiceOn; }
