/* =============================================================================

    GifScratcher
    Licensed under the MIT license.
    http://www.opensource.org/licenses/mit-license.php

   ============================================================================= */

/*! gifscratcher.ts (c) Linus Lundahl | MIT license */

import type { ParsedFrame } from 'gifuct-js';

export interface GifScratcherOptions {
  /** URL of a real animated .gif. Optional when the target contains an
      `<img src="...gif">` — the image's src is used instead. */
  gif?: string;
  /** Autoplay the animation */
  auto?: boolean;
  /** Scrub by moving/dragging over the element */
  scrub?: boolean;
  /** Add a custom cursor element */
  cursor?: boolean;
  /** Show a loading spinner while the gif is fetched/decoded */
  loader?: boolean;
  /** Render transport controls */
  player?: boolean;
  /** Playback speed multiplier */
  speed?: number;
}

type ResolvedOptions = Required<GifScratcherOptions>;

const DEFAULTS: ResolvedOptions = {
  gif: '',
  auto: true,
  scrub: true,
  cursor: true,
  loader: true,
  player: false,
  speed: 1,
};

/**
 * GifScratcher — a dependency-free GIF "scratching" widget.
 *
 * It decodes a real animated .gif onto a canvas (using the built-in
 * ImageDecoder API where available, a pure-JS gifuct-js fallback otherwise)
 * and lets you scrub, play, pause and step through frames.
 *
 * (A standalone sprite-strip variant lives in `gifscratcher-sprite.ts`.)
 *
 * @example
 * new GifScratcher('#target', { gif: 'animation.gif' });
 */
export class GifScratcher {
  private readonly options: ResolvedOptions;
  private readonly el: HTMLElement;

  // Decoded frames and playback timing.
  private frames: (VideoFrame | ImageBitmap)[] = [];
  private frameDelay = 100; // ms per frame, read from the file
  private decoder = '';
  // The authoritative canvas size, from the GIF header's logical screen size.
  private logicalSize: { w: number; h: number } | null = null;

  // Playback state.
  private playing = false;
  private autoRafId = 0;
  private lastTick = 0;
  private acc = 0;
  private currentFrame = 0;
  private hovering = false;
  private scrubbing = false;

  // Canvas + UI.
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cursor: HTMLElement | null = null;
  private wrapper: HTMLElement | null = null;
  private loader: HTMLElement | null = null;

  private playerBar: HTMLElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private slider: HTMLInputElement | null = null;
  private frameLabel: HTMLSpanElement | null = null;

  private readonly abort = new AbortController();
  private readonly signal = this.abort.signal;

  constructor(target: HTMLElement | string, options: GifScratcherOptions = {}) {
    const el =
      typeof target === 'string'
        ? document.querySelector<HTMLElement>(target)
        : target;

    if (!el) {
      throw new Error(`GifScratcher: no element found for "${target}".`);
    }

    this.el = el;
    this.options = { ...DEFAULTS, ...options };

    // Resolve the .gif source: the `gif` option wins, otherwise read it from
    // an <img> inside the target (progressive enhancement — with no JS the
    // <img> simply shows the animated gif).
    if (!this.options.gif) {
      const img = el.querySelector('img');
      if (img instanceof HTMLImageElement && img.src) {
        this.options.gif = img.src;
      }
    }

    if (!this.options.gif) {
      throw new Error(
        'GifScratcher: no .gif source. Pass `gif` or put an <img src="....gif"> inside the target.'
      );
    }

    this.el.classList.add('gifscratcher');
    this.init();
  }

  /* ========================================================================
     Setup / teardown
     ===================================================================== */

  private async init(): Promise<void> {
    // Swap the fallback <img> (if present) for a canvas in the same spot.
    const fallbackImg = this.el.querySelector('img');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gs-canvas';
    if (fallbackImg) {
      // Carry over accessibility/alt text.
      if (fallbackImg.alt) {
        this.canvas.setAttribute('role', 'img');
        this.canvas.setAttribute('aria-label', fallbackImg.alt);
      }
    }
    this.ctx = this.canvas.getContext('2d')!;

    // If there's a fallback <img>, the browser has already laid it out — copy
    // its rendered aspect ratio onto the canvas immediately, so the box is the
    // right size from the very first paint (before the fetch even resolves).
    if (fallbackImg) {
      const iw = fallbackImg.naturalWidth;
      const ih = fallbackImg.naturalHeight;
      if (iw && ih) {
        this.logicalSize = { w: iw, h: ih };
        this.setCanvasSize(iw, ih);
      }
    }

    if (fallbackImg) {
      fallbackImg.replaceWith(this.canvas);
    } else {
      this.el.appendChild(this.canvas);
    }

    // Reserve layout space and show a loader while we fetch + decode.
    this.el.classList.add('gs-loading');
    if (this.options.loader) this.buildLoader();

    try {
      const buf = await (await fetch(this.options.gif)).arrayBuffer();

      // The GIF header (Logical Screen Descriptor) holds the logical canvas
      // size. This is the authoritative size: frames are drawn INTO this box,
      // and we never resize afterwards — so the loader sits in the correctly
      // sized box and the layout doesn't jump when the animation appears.
      const dims = GifScratcher.readGifSize(buf);
      if (dims && (!this.logicalSize || dims.w !== this.logicalSize.w || dims.h !== this.logicalSize.h)) {
        this.logicalSize = dims;
        this.setCanvasSize(dims.w, dims.h);
      }

      this.frames = await this.decode(buf);
      // If neither the <img> nor the header gave a size, use the first frame.
      if (!this.logicalSize) this.sizeCanvas();

      if (this.options.cursor) this.buildCursor();
      if (this.options.player) this.buildPlayer();
      this.bindInteraction();

      this.render(0);
      if (this.options.auto) this.play();
      this.el.classList.remove('gs-loading');
      this.el.classList.add('gs-ready');
      this.teardownLoader();
      this.el.dispatchEvent(
        new CustomEvent('gifscratcher:ready', {
          detail: { frames: this.frames.length, decoder: this.decoder },
        })
      );
    } catch (err) {
      this.el.classList.remove('gs-loading');
      this.el.classList.add('gs-error');
      this.teardownLoader();
      console.error('GifScratcher:', err);
      this.el.dispatchEvent(
        new CustomEvent('gifscratcher:error', { detail: { error: err } })
      );
    }
  }

  /**
   * Parses just the GIF header (Logical Screen Descriptor) to read the canvas
   * width/height without decoding any frames. Returns null if it's not a GIF.
   * Byte layout: 6-byte signature ("GIF87a"/"GIF89a"), then 2-byte little-endian
   * width at offset 6 and 2-byte little-endian height at offset 8.
   */
  private static readGifSize(buf: ArrayBuffer): { w: number; h: number } | null {
    if (buf.byteLength < 10) return null;
    const view = new DataView(buf);
    // Verify the GIF signature.
    const sig = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2)
    );
    if (sig !== 'GIF') return null;
    return {
      w: view.getUint16(6, true),
      h: view.getUint16(8, true),
    };
  }

  /** Sets the canvas pixel size and matching aspect ratio. */
  private setCanvasSize(w: number, h: number): void {
    if (!this.canvas || !w || !h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.aspectRatio = `${w} / ${h}`;
  }

  /**
   * Removes all listeners, the cursor/player UI and the canvas.
   */
  destroy(): void {
    this.abort.abort();
    window.cancelAnimationFrame(this.autoRafId);
    this.teardownCursor();
    this.teardownLoader();
    this.teardownPlayer();
    this.frames.forEach((f) => (f as VideoFrame).close?.());
    this.frames = [];
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
    this.el.classList.remove('gifscratcher', 'has-gs-cursor', 'active', 'gs-loading', 'gs-ready', 'gs-error');
  }

  /**
   * Update options live, without re-decoding.
   */
  setOptions(options: Partial<GifScratcherOptions>): this {
    const prev = { ...this.options };
    Object.assign(this.options, options);

    if (options.player !== undefined && options.player !== prev.player) {
      if (options.player && this.frames.length) this.buildPlayer();
      else this.teardownPlayer();
    }

    if (options.cursor !== undefined && options.cursor !== prev.cursor) {
      if (options.cursor) this.buildCursor();
      else this.teardownCursor();
    }

    if (options.auto !== undefined && options.auto !== prev.auto) {
      if (options.auto && !this.hovering) this.play();
      else if (!options.auto) this.stop();
    }

    return this;
  }

  /* ========================================================================
     Decoding
     ===================================================================== */

  private async decode(buf: ArrayBuffer): Promise<(VideoFrame | ImageBitmap)[]> {
    // Preferred: the built-in ImageDecoder API (Chrome/Edge/Opera).
    if ('ImageDecoder' in window) {
      const decoder = new ImageDecoder({ data: buf, type: 'image/gif' });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const out: VideoFrame[] = [];
      const count = track?.frameCount ?? 0;
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        out.push(image);
        if (i === 0 && image.duration) this.frameDelay = image.duration / 1000;
      }
      this.decoder = 'ImageDecoder';
      return out;
    }

    // Fallback (Firefox/Safari): parse with gifuct-js and composite frames.
    return this.decodeWithGifuct(buf);
  }

  private async decodeWithGifuct(buf: ArrayBuffer): Promise<ImageBitmap[]> {
    const { parseGIF, decompressFrames } = await import('gifuct-js');
    const gif = parseGIF(buf);
    const raw: ParsedFrame[] = decompressFrames(gif, true);
    if (!raw.length) throw new Error('gifuct-js decoded zero frames.');

    const { width, height } = raw[0].dims;

    const comp = document.createElement('canvas');
    comp.width = width;
    comp.height = height;
    const cctx = comp.getContext('2d')!;

    const patch = document.createElement('canvas');
    const pctx = patch.getContext('2d')!;

    const out: ImageBitmap[] = [];
    for (const f of raw) {
      const { width: w, height: h, top, left } = f.dims;
      if (f.delay) this.frameDelay = f.delay;

      patch.width = w;
      patch.height = h;
      pctx.putImageData(new ImageData(new Uint8ClampedArray(f.patch), w, h), 0, 0);
      cctx.drawImage(patch, left, top);
      out.push(await createImageBitmap(comp));

      // Disposal 2 = restore to background (transparent) after the frame.
      if (f.disposalType === 2) {
        cctx.clearRect(left, top, w, h);
      }
    }

    this.decoder = 'gifuct-js';
    return out;
  }

  private sizeCanvas(): void {
    if (!this.canvas || !this.frames.length) return;
    const f0 = this.frames[0] as VideoFrame & ImageBitmap;
    this.canvas.width = f0.displayWidth || f0.codedWidth || f0.width;
    this.canvas.height = f0.displayHeight || f0.codedHeight || f0.height;
  }

  /* ========================================================================
     Playback
     ===================================================================== */

  /** Render a frame (wraps around). */
  render(i: number): this {
    if (!this.frames.length || !this.ctx || !this.canvas) return this;
    const n = this.frames.length;
    this.currentFrame = ((i % n) + n) % n;
    this.ctx.drawImage(this.frames[this.currentFrame], 0, 0, this.canvas.width, this.canvas.height);
    if (this.slider) this.slider.value = String(this.currentFrame);
    if (this.frameLabel) this.frameLabel.textContent = `${this.currentFrame + 1}/${n}`;
    return this;
  }

  /** Start playback. */
  play(): this {
    if (this.playing) return this;
    this.playing = true;
    this.syncPlayer();
    this.lastTick = performance.now();
    const step = (now: number) => {
      if (!this.playing) return;
      this.autoRafId = window.requestAnimationFrame(step);
      this.acc += now - this.lastTick;
      this.lastTick = now;
      const interval = this.frameDelay / Math.max(0.1, this.options.speed);
      while (this.acc >= interval) {
        this.acc -= interval;
        this.render(this.currentFrame + 1);
      }
    };
    this.autoRafId = window.requestAnimationFrame(step);
    return this;
  }

  /** Stop playback. */
  stop(): this {
    this.playing = false;
    window.cancelAnimationFrame(this.autoRafId);
    this.syncPlayer();
    return this;
  }

  /** Rewind one frame. */
  rewind(): this {
    return this.render(this.currentFrame - 1);
  }

  /** Forward one frame. */
  forward(): this {
    return this.render(this.currentFrame + 1);
  }

  /** The current frame index. */
  get frame(): number {
    return this.currentFrame;
  }

  /** True while playing. */
  get isPlaying(): boolean {
    return this.playing;
  }

  /* ========================================================================
     Interaction (hover / drag scrub + custom cursor)
     ===================================================================== */

  private bindInteraction(): void {
    const c = this.canvas!;
    c.style.touchAction = 'none';

    c.addEventListener('pointerenter', () => {
      this.hovering = true;
      if (this.options.auto) this.stop();
      this.wrapper?.classList.add('active');
      this.el.classList.add('active');
    }, { signal: this.signal });

    c.addEventListener('pointermove', (e) => {
      if (this.options.scrub) this.scrubTo(e.clientX);
      this.moveCursor(e.clientX, e.clientY);
    }, { signal: this.signal });

    c.addEventListener('pointerleave', () => {
      this.hovering = false;
      if (this.options.auto && !this.scrubbing) this.play();
      this.wrapper?.classList.remove('active');
      this.el.classList.remove('active');
      if (this.cursor) this.cursor.style.transform = '';
    }, { signal: this.signal });

    let dragging = false;
    c.addEventListener('pointerdown', (e) => {
      if (!this.options.scrub) return;
      dragging = true;
      this.scrubbing = true;
      this.stop();
      c.setPointerCapture(e.pointerId);
      this.scrubTo(e.clientX);
    }, { signal: this.signal });
    c.addEventListener('pointermove', (e) => {
      if (dragging && this.options.scrub) this.scrubTo(e.clientX);
    }, { signal: this.signal });
    const endDrag = () => {
      dragging = false;
      this.scrubbing = false;
    };
    c.addEventListener('pointerup', endDrag, { signal: this.signal });
    c.addEventListener('pointercancel', endDrag, { signal: this.signal });
  }

  private scrubTo(clientX: number): void {
    if (!this.frames.length) return;
    const rect = this.canvas!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    this.render(Math.floor((x / rect.width) * this.frames.length));
  }

  /* ========================================================================
     Custom cursor
     ===================================================================== */

  private buildCursor(): void {
    if (this.cursor || !this.options.cursor) return;
    this.ensureWrapper();

    // The shake wrapper carries the periodic "you can scrub me" wiggle via a
    // CSS transform keyframe, while .gs-cursor keeps the JS-driven positioning
    // transform. Nesting them means the two transforms compose instead of
    // fighting over the same property on one element.
    const shake = document.createElement('div');
    shake.className = 'gs-shake';

    this.cursor = document.createElement('div');
    this.cursor.className = 'gs-cursor';
    this.cursor.setAttribute('aria-hidden', 'true');

    shake.appendChild(this.cursor);
    this.wrapper!.appendChild(shake);
    this.wrapper!.classList.add('has-gs-cursor');
    this.el.classList.add('has-gs-cursor');
  }

  private ensureWrapper(): void {
    if (this.wrapper || !this.canvas) return;
    const w = document.createElement('div');
    w.className = 'gs-wrap';
    this.canvas.parentNode?.insertBefore(w, this.canvas);
    w.appendChild(this.canvas);
    this.wrapper = w;
  }

  private moveCursor(clientX: number, clientY: number): void {
    if (!this.cursor) return;
    const rect = this.canvas!.getBoundingClientRect();
    const dx = clientX - rect.left - rect.width / 2;
    const dy = clientY - rect.top - rect.height / 2;
    const scale = this.hovering ? 0.85 : 1;
    this.cursor.style.transform =
      `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(${scale})`;
  }

  private teardownCursor(): void {
    this.cursor?.closest('.gs-shake')?.remove();
    this.cursor = null;
    this.wrapper?.classList.remove('has-gs-cursor', 'active');
    this.el.classList.remove('has-gs-cursor');
  }

  /* ========================================================================
     Loader UI
     ===================================================================== */

  private buildLoader(): void {
    if (this.loader) return;
    this.loader = document.createElement('div');
    this.loader.className = 'gs-loader';
    this.loader.setAttribute('role', 'status');
    this.loader.setAttribute('aria-label', 'Loading animation');
    this.el.appendChild(this.loader);
  }

  private teardownLoader(): void {
    this.loader?.remove();
    this.loader = null;
  }

  /* ========================================================================
     Player UI
     ===================================================================== */

  private buildPlayer(): void {
    if (this.playerBar) return;
    const bar = document.createElement('div');
    bar.className = 'gs-player';

    const mk = (label: string, title: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = label;
      b.title = title;
      b.addEventListener('click', onClick, { signal: this.signal });
      return b;
    };

    this.playBtn = mk('Play', 'Play / pause', () =>
      this.playing ? this.stop() : this.play()
    );
    const rew = mk('&#9198;', 'Rewind one frame', () => { this.stop(); this.rewind(); });
    const fwd = mk('&#9197;', 'Forward one frame', () => { this.stop(); this.forward(); });

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = String(this.frames.length - 1);
    this.slider.step = '1';
    this.slider.value = '0';
    this.slider.addEventListener('input', () => {
      this.stop();
      this.render(Number(this.slider!.value));
    }, { signal: this.signal });

    this.frameLabel = document.createElement('span');
    this.frameLabel.className = 'gs-frame';

    bar.append(this.playBtn, rew, fwd, this.slider, this.frameLabel);
    (this.wrapper ?? this.canvas!).insertAdjacentElement('afterend', bar);
    this.playerBar = bar;
    this.syncPlayer();
  }

  private syncPlayer(): void {
    if (this.playBtn) {
      this.playBtn.textContent = this.playing ? 'Pause' : 'Play';
      this.playBtn.setAttribute('aria-pressed', String(this.playing));
    }
  }

  private teardownPlayer(): void {
    this.playerBar?.remove();
    this.playerBar = null;
    this.playBtn = null;
    this.slider = null;
    this.frameLabel = null;
  }
}
