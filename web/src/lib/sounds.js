// web/src/lib/sounds.js

const MUTE_STORAGE_KEY = 'gdg_race_intro_muted';

// Public-domain / CC0 direct MP3 links (with automatic Web Audio API fallback if any fail)
const SOUND_CONFIG = {
  whoosh: {
    url: 'https://archive.org/download/SoundEffectsPack/Whoosh.mp3',
    volume: 0.35,
    loop: false,
  },
  beep: {
    url: 'https://archive.org/download/beep-07/beep-07.mp3',
    volume: 0.35,
    loop: false,
  },
  engine: {
    url: 'https://archive.org/download/CarEngineLoop/CarEngineLoop.mp3',
    volume: 0.2,
    loop: true,
  },
  tick: {
    url: 'https://archive.org/download/ClockTicking/ClockTicking.mp3',
    volume: 0.18,
    loop: false,
  },
  cheer: {
    url: 'https://archive.org/download/CrowdCheering/CrowdCheering.mp3',
    volume: 0.4,
    loop: false,
  },
  fanfare: {
    url: 'https://archive.org/download/TadaFanfare/TadaFanfare.mp3',
    volume: 0.45,
    loop: false,
  },
};

class SoundManager {
  constructor() {
    this.audios = {};
    this.failed = {};
    this.muted = this._readMuteStorage();
    this.audioCtx = null;
    this.engineSynthNodes = null;
    this.preloaded = false;
  }

  _readMuteStorage() {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  _writeMuteStorage(val) {
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(val));
    } catch {
      // Ignore storage quota or private-mode errors
    }
  }

  // Call this inside the SwagPopup close click handler to unlock browser audio
  unlock() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {
      // Web Audio not supported
    }
    this.preload();
  }

  preload() {
    if (this.preloaded || typeof Audio === 'undefined') return;
    this.preloaded = true;

    Object.entries(SOUND_CONFIG).forEach(([name, cfg]) => {
      try {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.volume = cfg.volume;
        audio.loop = cfg.loop;
        audio.muted = this.muted;

        audio.addEventListener('error', () => {
          this.failed[name] = true;
        });

        audio.src = cfg.url;
        audio.load();
        this.audios[name] = audio;
      } catch {
        this.failed[name] = true;
      }
    });
  }

  isMuted() {
    return this.muted;
  }

  setMuted(bool) {
    this.muted = Boolean(bool);
    this._writeMuteStorage(this.muted);

    Object.values(this.audios).forEach((audio) => {
      if (audio) audio.muted = this.muted;
    });

    if (this.muted) {
      this._stopEngineSynth();
    }
  }

  play(name, options = {}) {
    if (this.muted) return;

    const audio = this.audios[name];
    if (audio && !this.failed[name]) {
      try {
        if (!SOUND_CONFIG[name]?.loop) {
          audio.currentTime = 0;
        }
        audio.muted = this.muted;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Autoplay blocked or file failed mid-stream -> use Web Audio synth fallback
            this._playFallbackSynth(name, options);
          });
        }
        return;
      } catch {
        this.failed[name] = true;
      }
    }

    // Fallback if MP3 failed to load or is unavailable
    this._playFallbackSynth(name, options);
  }

  stop(name) {
    const audio = this.audios[name];
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    if (name === 'engine') {
      this._stopEngineSynth();
    }
  }

  stopAll() {
    Object.keys(SOUND_CONFIG).forEach((name) => this.stop(name));
    this._stopEngineSynth();
  }

  // --- Web Audio API Synthesizer Fallback ---
  _getContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  _playFallbackSynth(name, options = {}) {
    if (this.muted) return;
    const ctx = this._getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    try {
      if (name === 'beep') {
        const isGo = options.high === true;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.18));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.36 : 0.2));
      } else if (name === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (name === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      } else if (name === 'engine') {
        if (this.engineSynthNodes) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.linearRampToValueAtTime(135, now + 3.5);
        gain.gain.setValueAtTime(0.04, now);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        this.engineSynthNodes = { osc, gain };
      } else if (name === 'cheer' || name === 'fanfare') {
        // Major chord arpeggio (C5 - E5 - G5 - C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const start = now + idx * 0.09;
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.14, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.6);
        });
      }
    } catch {
      // Ignore Web Audio edge-case errors
    }
  }

  _stopEngineSynth() {
    if (this.engineSynthNodes) {
      try {
        this.engineSynthNodes.osc.stop();
        this.engineSynthNodes.osc.disconnect();
      } catch {
        // Ignore already stopped
      }
      this.engineSynthNodes = null;
    }
  }
}

export const sounds = new SoundManager();