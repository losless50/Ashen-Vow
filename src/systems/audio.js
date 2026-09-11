// Opt-in feedback: recorded sword samples for the blade, synthesized tones for
// everything else. Nothing is created until the player enables sound.
import { shell } from '../core/platform.js';

let audioOn = false, audio = null;

/**
 * The desktop shell is the odd one out: media elements play, but anything routed
 * through the audio graph is swallowed, even though the context reports itself
 * running and holds a live output stream. So there we keep the graph out of it
 * and go through elements for everything, which is the one path it honours.
 */
const graphSilent = () => shell() === 'tauri';

export const soundEnabled = () => audioOn;

/** Recorded clips in src/assets/audio, keyed by what they are for. */
const SAMPLES = {
  slice1: 'sword-slice-1.mp3',
  slice2: 'sword-slice-2.mp3',
  impact: 'armor-impact.mp3',
  hit1: 'hit-taken-1.mp3',
  hit2: 'hit-taken-2.mp3',
  hit3: 'hit-taken-3.mp3',
  hit4: 'hit-taken-4.mp3',
  hit5: 'hit-taken-5.mp3',
  stepGrass: 'step-grass.mp3',
  stepDirt: 'step-dirt.mp3',
  wardenRoar1: 'warden-roar-1.mp3',
  wardenRoar2: 'warden-roar-2.mp3',
  wardenDeath: 'warden-death.mp3',
  creatureSnarl: 'creature-snarl.mp3',
  frogCroak: 'frog-croak.mp3',
  goblin2: 'goblin-2.mp3',
  goblin3: 'goblin-3.mp3',
  goblin4: 'goblin-4.mp3',
  goblin5: 'goblin-5.mp3',
  aldrenDeath: 'aldren-death.mp3',
  vaeliraHurt1: 'vaelira-hurt-1.mp3',
  vaeliraHurt2: 'vaelira-hurt-2.mp3',
  vaeliraStage2: 'vaelira-stage-2.mp3',
  vaeliraDeath: 'vaelira-death.mp3',
};
const media = new Map();          // file -> a URL an <audio> can actually read

const fileUrl = file => new URL(`../assets/audio/${file}`, import.meta.url).href;

/**
 * The desktop shell's browser hands media to GStreamer, which cannot read the
 * custom scheme a packaged build is served from — an <audio> pointed straight at
 * the file is silent there, though the same file plays over http. Pulling each
 * one in ourselves and handing over a blob works in every shell.
 */
async function load(file) {
  if (media.has(file)) return media.get(file);
  let url = fileUrl(file);
  try {
    const res = await fetch(url);
    if (res.ok) url = URL.createObjectURL(await res.blob());
  } catch { /* keep the plain address and hope */ }
  media.set(file, url);
  return url;
}

// The short clips are also decoded into the audio graph. Playing them from a
// buffer needs no address at all, which is the surest way to be heard in a
// packaged shell; the <audio> element stays as the fallback.
const buffers = new Map();

function context() {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

/** Whether the graph is awake. A suspended context accepts every call and is silent. */
const graphRunning = () => audio?.state === 'running';

/**
 * The desktop shell only lets a context start from inside a real gesture, and it
 * ignores a later resume — so a graph first touched from the game loop stays
 * suspended for good, and every synthesized sound is swallowed while the music,
 * which is an element started in the gesture, plays on. Opening it here, on the
 * first tap or key, is what keeps the two in step. Browsers are happy either way.
 */
export async function primeAudio() {
  try {
    const ctx = context();
    if (ctx.state === 'suspended') await ctx.resume();
  } catch { /* the elements carry it from here */ }
}

async function decode(file) {
  if (buffers.has(file)) return;
  buffers.set(file, null);                      // claimed, so two calls do not both fetch
  try {
    const res = await fetch(media.get(file) || fileUrl(file));
    const bytes = await res.arrayBuffer();
    const ctx = context();
    const buffer = await new Promise((ok, no) => {
      const p = ctx.decodeAudioData(bytes, ok, no);
      if (p?.then) p.then(ok, no);
    });
    buffers.set(file, buffer);
  } catch { /* the element will have to do */ }
}

/**
 * A handful of ready elements per sound, cycled round. Building one costs the
 * desktop shell a whole media pipeline, which is far too much to spend on a
 * footstep — so they are built once, up front, and only ever rewound after that.
 */
const voices = new Map();               // url -> { ready: [element], next }
function playUrl(url, vol, rate, count = 2) {
  let pool = voices.get(url);
  if (!pool) { pool = { ready: [], next: 0 }; voices.set(url, pool); }
  // Grown only as far as overlapping plays actually demand.
  if (pool.ready.length < count) {
    const el = new Audio(url);
    el.preload = 'auto';
    pool.ready.push(el);
  }
  const el = pool.ready[pool.next++ % pool.ready.length];
  try {
    if (!el.paused) el.pause();
    if (el.currentTime) el.currentTime = 0;
    el.volume = Math.max(0, Math.min(1, vol));
    el.playbackRate = rate;
    el.play()?.catch?.(() => {});
  } catch { /* this voice is busy; the next one round will take it */ }
}

/** Plays a recorded clip; overlapping plays each get their own voice. */
export function sample(name, vol = .6, rate = 1) {
  if (!audioOn || !SAMPLES[name]) return;
  const file = SAMPLES[name];
  try {
    const buffer = buffers.get(file);
    if (buffer && graphRunning() && !graphSilent()) {
      const ctx = context();
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      gain.gain.value = vol;
      src.connect(gain).connect(ctx.destination);
      src.start();
      return;
    }
    playUrl(media.get(file) || fileUrl(file), vol, rate);
  } catch { /* audio is a nicety, never a failure */ }
}

export function toggleSound() {
  setSound(!audioOn);
  if (audioOn) tone(550, .2);
  return audioOn;
}

/** Turns all sound on or off; music pauses and resumes with it. */
export function setSound(on) {
  audioOn = !!on;
  if (audioOn) {
    primeAudio();
    // The short clips are pulled in and decoded at once; the long tracks stream
    // from an element as they are asked for, so nothing holds minutes of PCM.
    try {
      for (const file of Object.values(SAMPLES)) {
        // The address is always wanted; the graph's copy only where it can be heard.
        load(file).then(() => graphSilent() || decode(file));
      }
    } catch { /* no fetch here */ }
    startMusic();
  } else {
    for (const m of playingMusic) { m.el.pause(); }
    playingMusic.length = 0;
    music.current = null;
    ambience.current = null;
  }
}

// --- music -------------------------------------------------------------------------
// Two looping tracks: the banishment under the title and the intro cards, the
// wilds once the player is in the world. Switching crossfades over a few seconds.
const TRACKS = {
  intro: 'iron-and-ash.mp3',
  wilds: 'stone-and-silence.mp3',
  boss: 'the-final-chant.mp3',
  grove: 'mire-of-forgotten-things.mp3',
  groveBoss: 'slimey-spore-swarm.mp3',
};

/** What each region plays in the open, and what its bosses play. */
const REGION_TRACKS = { hearthwood: ['wilds', 'boss'], echo: ['grove', 'groveBoss'] };
export const worldTrack = region => (REGION_TRACKS[region] || REGION_TRACKS.hearthwood)[0];
export const bossTrack = region => (REGION_TRACKS[region] || REGION_TRACKS.hearthwood)[1];
/** Looping beds that sit under the music: the wind in the trees around Hearthwood. */
const AMBIENCE = {
  forest: 'forest-wind.mp3',
};

let unlocked = false;
const playingMusic = [];   // every looping element in flight: [{ channel, name, el, vol, target, rate }]
let fadeTimer = null;

function stepFades() {
  for (const m of [...playingMusic]) {
    m.vol = m.target > m.vol ? Math.min(m.target, m.vol + m.rate) : Math.max(m.target, m.vol - m.rate);
    m.el.volume = Math.max(0, Math.min(1, m.vol));
    if (m.vol <= 0 && m.target <= 0) {
      m.el.pause();
      playingMusic.splice(playingMusic.indexOf(m), 1);
    }
  }
  if (!playingMusic.some(m => m.vol !== m.target)) { clearInterval(fadeTimer); fadeTimer = null; }
}

function fadeTo(m, target, seconds) {
  m.target = target;
  m.rate = Math.abs(target - m.vol) / Math.max(1, seconds * 20);
  fadeTimer ??= setInterval(stepFades, 50);
}

/** One looping layer — music or ambience — that crossfades between its tracks, or to silence. */
class Channel {
  constructor(tracks, volume) { this.tracks = tracks; this.volume = volume; this.wanted = null; this.current = null; }

  /** Starts (or crossfades to) the wanted track; needs sound on and a first gesture. `null` fades out. */
  async start(fade = 3) {
    if (!audioOn || !unlocked || this.current === this.wanted) return;
    const wanted = this.wanted;
    this.current = wanted;                       // claimed now, so a second call does not double up
    try {
      for (const m of playingMusic) if (m.channel === this) fadeTo(m, 0, fade);
      if (!wanted) return;
      const url = await load(this.tracks[wanted]);
      if (this.wanted !== wanted || !audioOn) return;   // it changed while the file was coming in
      const el = new Audio(url);
      el.loop = true;
      el.volume = 0;
      el.play()?.catch?.(() => {});
      const m = { channel: this, name: wanted, el, vol: 0, target: 0, rate: 0 };
      playingMusic.push(m);
      fadeTo(m, this.volume, fade);
    } catch { /* no audio here */ }
  }

  want(name, fade) {
    if (name !== null && !this.tracks[name]) return;
    this.wanted = name;
    this.start(fade);
  }
}

const music = new Channel(TRACKS, .55);
const ambience = new Channel(AMBIENCE, .32);
music.wanted = 'intro';

export const currentMusic = () => music.current;
export const wantedMusic = () => music.wanted;
export const wantedAmbience = () => ambience.wanted;

/** Asks for a music track; it plays as soon as sound is on and the page has been touched. */
export const playMusic = (name, fade = 3) => music.want(name, fade);

/** Asks for an ambience bed under the music, or `null` for none. */
export const playAmbience = (name, fade = 3) => ambience.want(name, fade);

function startMusic() {
  music.start(1.5);
  ambience.start(1.5);
}

/** The first tap or key: browsers allow audio only after a gesture. */
export function unlockAudio() {
  unlocked = true;
  primeAudio();
  startMusic();
}

/**
 * The same short tone the graph would have made, written out as a little WAV: a
 * falling voice under a fading envelope. Cached, because the game asks for the
 * same handful of them thousands of times over a session.
 */
const toneClips = new Map();

const lastTone = new Map();

function toneUrl(f, d, type, vol) {
  const key = `${f}:${d}:${type}:${vol}`;
  if (toneClips.has(key)) return toneClips.get(key);
  const rate = 22050, n = Math.max(1, Math.round(d * rate));
  const pcm = new Int16Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;                                    // 0 → 1 across the tone
    const hz = f * Math.pow(.5, t);                     // the same halving slide
    const gain = vol * Math.pow(.001 / Math.max(vol, 1e-6), t);
    phase += hz / rate;
    const x = phase % 1;
    const wave = type === 'square' ? (x < .5 ? 1 : -1)
      : type === 'sawtooth' ? 2 * x - 1
      : type === 'triangle' ? 4 * Math.abs(x - .5) - 1
      : Math.sin(x * Math.PI * 2);
    pcm[i] = Math.max(-32768, Math.min(32767, wave * gain * 32767));
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2), view = new DataView(buf);
  const str = (at, text) => { for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  toneClips.set(key, url);
  return url;
}

export function tone(f = 330, d = .08, type = 'sine', vol = .025) {
  if (!audioOn) return;
  if (graphSilent()) {
    const now = performance.now();
    if (now - (lastTone.get(`${f}:${type}`) ?? -99) < 40) return;
    lastTone.set(`${f}:${type}`, now);
    try { playUrl(toneUrl(f, d, type, vol), 1, 1, 3); } catch { /* a nicety, never a failure */ }
    return;
  }
  try {
    const audio = context();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(f * .5, audio.currentTime + d);
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + d);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + d);
  } catch { /* audio is a nicety, never a failure */ }
}
