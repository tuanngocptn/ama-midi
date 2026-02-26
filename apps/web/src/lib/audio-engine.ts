import { PITCH_FREQUENCIES } from '@ama-midi/shared';
import type { Note } from '@ama-midi/shared';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private scheduledNodes: OscillatorNode[] = [];
  private animationId: number | null = null;
  private _isPlaying = false;
  private startCtxTime = 0;
  private startWallTime = 0;

  get isPlaying() {
    return this._isPlaying;
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playNote(pitch: number, durationSec = 0.3) {
    const ctx = this.getContext();
    const freq = PITCH_FREQUENCIES[pitch];
    if (!freq) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    const now = ctx.currentTime;
    const attack = 0.01;
    const decay = 0.1;
    const sustain = 0.3;
    const release = 0.2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.setValueAtTime(sustain, now + durationSec - release);
    gain.gain.linearRampToValueAtTime(0, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  play(
    notes: Note[],
    bpm: number,
    onTick: (currentTime: number) => void,
    onEnd: () => void,
  ) {
    this.stop();
    if (notes.length === 0) {
      onEnd();
      return;
    }

    const ctx = this.getContext();
    this._isPlaying = true;
    const beatsToSec = 30 / bpm;
    const noteDuration = beatsToSec * 0.8;

    const maxBeat = Math.max(...notes.map((n) => n.time));
    const totalDuration = (maxBeat + 1) * beatsToSec + 0.5;

    this.startCtxTime = ctx.currentTime;
    this.startWallTime = performance.now();

    for (const note of notes) {
      const freq = PITCH_FREQUENCIES[note.pitch];
      if (!freq) continue;

      const offset = note.time * beatsToSec;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startAt = this.startCtxTime + offset;
      const attack = 0.01;
      const decay = 0.1;
      const sustain = 0.25;
      const release = 0.15;
      const dur = noteDuration;

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.5, startAt + attack);
      gain.gain.linearRampToValueAtTime(sustain, startAt + attack + decay);
      gain.gain.setValueAtTime(sustain, startAt + dur - release);
      gain.gain.linearRampToValueAtTime(0, startAt + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.05);

      this.scheduledNodes.push(osc);
    }

    const tick = () => {
      if (!this._isPlaying) return;
      const elapsedSec = (performance.now() - this.startWallTime) / 1000;
      onTick(elapsedSec / beatsToSec);
      if (elapsedSec >= totalDuration) {
        this.stop();
        onEnd();
        return;
      }
      this.animationId = requestAnimationFrame(tick);
    };
    this.animationId = requestAnimationFrame(tick);
  }

  stop() {
    this._isPlaying = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    for (const osc of this.scheduledNodes) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.scheduledNodes = [];
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
