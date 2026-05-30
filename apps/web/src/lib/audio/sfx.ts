// Procedural sound effects via Web Audio — no asset files, no license burden.
// Each preset is a short sequence of notes (oscillator + gain envelope).

type Note = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
  sweepTo?: number;
};

type SfxName =
  | "correct"
  | "wrong"
  | "hint"
  | "start"
  | "opponent"
  | "win"
  | "lose"
  | "tap"
  | "streak"
  | "streakMax"
  | "streakBreak";

const PRESETS: Record<SfxName, Note[]> = {
  correct: [
    { freq: 523, dur: 0.09 },
    { freq: 659, dur: 0.09, delay: 0.08 },
    { freq: 784, dur: 0.16, delay: 0.16 },
  ],
  wrong: [{ freq: 200, dur: 0.2, type: "square", sweepTo: 110, gain: 0.16 }],
  hint: [{ freq: 880, dur: 0.08 }],
  // bright rising arpeggio — pitched up per streak level via the transpose opt
  streak: [
    { freq: 659, dur: 0.07 },
    { freq: 880, dur: 0.07, delay: 0.06 },
    { freq: 1175, dur: 0.16, delay: 0.12 },
  ],
  // triumphant fanfare when the multiplier hits its 2x cap
  streakMax: [
    { freq: 784, dur: 0.1 },
    { freq: 988, dur: 0.1, delay: 0.09 },
    { freq: 1319, dur: 0.1, delay: 0.18 },
    { freq: 1568, dur: 0.3, delay: 0.27 },
  ],
  // descending sting — the painful loss of an earned streak
  streakBreak: [
    { freq: 587, dur: 0.12, type: "triangle", sweepTo: 440 },
    { freq: 440, dur: 0.24, type: "triangle", delay: 0.12, sweepTo: 294 },
  ],
  start: [
    { freq: 330, dur: 0.1, sweepTo: 660 },
    { freq: 660, dur: 0.12, delay: 0.1 },
  ],
  opponent: [{ freq: 587, dur: 0.06, gain: 0.07 }],
  win: [
    { freq: 523, dur: 0.1 },
    { freq: 659, dur: 0.1, delay: 0.1 },
    { freq: 784, dur: 0.1, delay: 0.2 },
    { freq: 1047, dur: 0.3, delay: 0.3 },
  ],
  lose: [
    { freq: 392, dur: 0.16, type: "sawtooth", sweepTo: 330 },
    { freq: 294, dur: 0.32, type: "sawtooth", delay: 0.16, sweepTo: 196 },
  ],
  tap: [{ freq: 600, dur: 0.025, type: "square", gain: 0.05 }],
};

let ctx: AudioContext | null = null;
const getCtx = (): AudioContext => {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctx && Ctor) ctx = new Ctor();
  if (!ctx) throw new Error("no AudioContext");
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

// ── Mute: localStorage-backed singleton with a subscribe hook for React ───────
const KEY = "wc:muted";
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();

export const isMuted = (): boolean => muted;
export const subscribeMuted = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const setMuted = (v: boolean): void => {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // private mode / blocked storage — keep the in-memory value
  }
  for (const fn of listeners) fn();
};

// transpose shifts every note by N semitones — lets one preset escalate in pitch
export const playSfx = (name: SfxName, opts?: { transpose?: number }): void => {
  if (muted) return;
  let audio: AudioContext;
  try {
    audio = getCtx();
  } catch {
    return;
  }
  const ratio = opts?.transpose ? 2 ** (opts.transpose / 12) : 1;
  const now = audio.currentTime;
  for (const n of PRESETS[name]) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    const t0 = now + (n.delay ?? 0);
    const peak = n.gain ?? 0.13;
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.freq * ratio, t0);
    if (n.sweepTo) osc.frequency.exponentialRampToValueAtTime(n.sweepTo * ratio, t0 + n.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
    osc.connect(g).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }
};
