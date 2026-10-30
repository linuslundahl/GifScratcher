/* =============================================================================

    GifScratcher
    Licensed under the MIT license.
    http://www.opensource.org/licenses/mit-license.php

   ============================================================================= */

/*! gifscratcher.ts (c) Linus Lundahl | MIT license */

export interface GifScratcherOptions {
  /** Image sprite URL */
  sprite?: string;
  /** Number of frames in the sprite */
  frames?: number;
  /** Interaction mode: 'hover' | 'drag' */
  interaction?: 'hover' | 'drag';
  /** Autoplay the animation */
  auto?: boolean;
  /** Add a custom cursor element */
  cursor?: boolean;
  /** Autoplay speed (delay between frames, in rAF ticks) */
  speed?: number;
}

interface ResolvedOptions {
  sprite: string;
  frames: number;
  interaction: 'hover' | 'drag';
  auto: boolean;
  cursor: boolean;
  speed: number;
}

interface Size {
  w: number;
  h: number;
}

interface Rect {
  left: number;
  top: number;
}

const DEFAULTS: ResolvedOptions = {
  sprite: '',
  frames: 0,
  interaction: 'hover',
  auto: true,
  cursor: true,
  speed: 5,
};

/**
 * GifScratcher — a dependency-free GIF "scratching" widget.
 *
 * Performance notes:
 * - Frame switching and cursor movement are GPU-composited `transform`s.
 * - The element's bounding rect is cached and only re-measured on
 *   resize/scroll, never inside pointermove handlers (avoids forced layout).
 * - Pointer input is coalesced and applied at most once per animation frame.
 *
 * @example
 * new GifScratcher('#target', { sprite: 'animation.jpg', frames: 10 });
 */
export class GifScratcher {
  private readonly settings: ResolvedOptions;
  private readonly el: HTMLElement;
  private readonly image: HTMLImageElement;
  private cursor: HTMLElement | null = null;

  private size: Size = { w: 0, h: 0 };
  private rect: Rect = { left: 0, top: 0 };
  private frameWidth = 0;
  private oldFrame = 0;
  private autoFrame = 0;
  private userAction = false;

  // rAF-coalesced pointer state
  private pendingX: number | null = null;
  private pointerRafId = 0;

  private readonly abort = new AbortController();
  private readonly signal = this.abort.signal;
  private resizeObserver: ResizeObserver | null = null;
  private rafId = 0;

  constructor(target: HTMLElement | string, options: GifScratcherOptions = {}) {
    const el =
      typeof target === 'string'
        ? document.querySelector<HTMLElement>(target)
        : target;

    if (!el) {
      throw new Error(`GifScratcher: no element found for "${target}".`);
    }

    const img = el.querySelector('img');
    if (!(img instanceof HTMLImageElement)) {
      throw new Error('GifScratcher: target element must contain an <img>.');
    }

    this.el = el;
    this.image = img;
    this.settings = { ...DEFAULTS, ...options };

    if (this.settings.sprite) {
      this.setup();
    }
  }

  /**
   * True on devices without hover capability (replaces UA sniffing).
   */
  private static get isTouchDevice(): boolean {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  /**
   * Preloads the sprite, then wires up sizing, cursor and interaction.
   */
  private setup(): void {
    this.el.classList.add('gifscratcher');
    this.image.classList.add('gs-img');
    this.image.draggable = false;

    this.preload(() => {
      this.observeResize();
      this.addCursor();

      if (this.settings.auto) {
        this.el.classList.add('gs-auto');
        this.auto();
      }

      if (GifScratcher.isTouchDevice) {
        this.el.classList.add('gs-touch');
        this.touchInteraction();
      } else {
        const mode = this.settings.interaction === 'drag' ? 'drag' : 'hover';
        this.el.classList.add(`gs-${mode}`);
        if (mode === 'drag') {
          this.dragInteraction();
        } else {
          this.hoverInteraction();
        }
        this.hover();
      }
    });
  }

  /**
   * Removes all listeners, observers, the cursor element and CSS classes.
   */
  destroy(): void {
    this.abort.abort();
    this.resizeObserver?.disconnect();
    window.cancelAnimationFrame(this.rafId);
    window.cancelAnimationFrame(this.pointerRafId);
    this.cursor?.remove();
    this.el.classList.remove(
      'gifscratcher',
      'has-gs-cursor',
      'gs-auto',
      'gs-touch',
      'gs-hover',
      'gs-drag',
      'active'
    );
    this.image.classList.remove('gs-img');
    this.image.removeAttribute('style');
  }

  /**
   * Appends a cursor div to the element.
   */
  addCursor(): this {
    if (this.settings.cursor) {
      this.el.classList.add('has-gs-cursor');
      this.cursor = document.createElement('div');
      this.cursor.classList.add('gs-cursor');
      this.el.appendChild(this.cursor);
    }

    return this;
  }

  /**
   * Preloads the sprite.
   */
  preload(callback?: () => void): this {
    const img = new Image();
    img.onload = () => {
      this.image.src = this.settings.sprite;
      callback?.();
    };
    img.onerror = () => {
      console.warn(`GifScratcher: failed to load sprite "${this.settings.sprite}".`);
    };
    img.src = this.settings.sprite;

    return this;
  }

  /**
   * Touch interaction: press and move to scratch.
   */
  touchInteraction(): this {
    this.el.style.touchAction = 'none';

    this.el.addEventListener(
      'pointerdown',
      () => {
        this.userAction = true;
        this.el.classList.add('active');
      },
      { signal: this.signal }
    );

    window.addEventListener(
      'pointerup',
      () => {
        this.userAction = false;
        this.el.classList.remove('active');
      },
      { signal: this.signal }
    );

    this.el.addEventListener(
      'pointermove',
      (e) => {
        if (this.userAction) {
          this.queuePlay(e.clientX);
        }
      },
      { signal: this.signal }
    );

    return this;
  }

  /**
   * Hover interaction: moving over the element scratches.
   */
  hoverInteraction(): this {
    this.el.addEventListener('pointermove', (e) => this.queuePlay(e.clientX), {
      signal: this.signal,
    });

    return this;
  }

  /**
   * Drag interaction: press the cursor and move to scratch.
   */
  dragInteraction(): this {
    let dragging = false;
    this.el.style.touchAction = 'none';

    const dragTarget = this.cursor ?? this.el;

    dragTarget.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        dragging = true;
        this.el.setPointerCapture(e.pointerId);
      },
      { signal: this.signal }
    );

    this.el.addEventListener(
      'pointerup',
      () => {
        dragging = false;
      },
      { signal: this.signal }
    );

    this.el.addEventListener(
      'pointercancel',
      () => {
        dragging = false;
      },
      { signal: this.signal }
    );

    this.el.addEventListener(
      'pointermove',
      (e) => {
        if (dragging) {
          this.queuePlay(e.clientX);
        }
      },
      { signal: this.signal }
    );

    return this;
  }

  /**
   * Autoplays the animation until the user interacts.
   */
  auto(): this {
    let delay = 0;

    const tick = () => {
      this.rafId = window.requestAnimationFrame(tick);
      if (!this.userAction && delay === this.settings.speed) {
        this.switchFrame(this.autoFrame);
        this.autoFrame =
          this.autoFrame >= this.settings.frames - 1 ? 0 : this.autoFrame + 1;
      }
      delay = delay === this.settings.speed ? 0 : delay + 1;
    };
    tick();

    return this;
  }

  /**
   * Tracks pointer enter/leave to toggle the active state and custom cursor.
   */
  hover(): this {
    this.el.addEventListener(
      'pointerenter',
      () => {
        this.el.classList.add('active');
        this.userAction = true;
      },
      { signal: this.signal }
    );

    this.el.addEventListener(
      'pointerleave',
      () => {
        this.el.classList.remove('active');
        this.userAction = false;
        this.autoFrame = this.oldFrame;
        if (this.cursor) {
          this.cursor.style.transform = '';
        }
      },
      { signal: this.signal }
    );

    if (this.cursor) {
      this.el.addEventListener(
        'pointermove',
        (e) => {
          // Uses the cached rect — no forced layout. transform is composited.
          // The cursor's resting spot is the element's center (left/top: 50%),
          // so translate from that center to the pointer.
          const dx = e.clientX - this.rect.left - this.size.w / 2;
          const dy = e.clientY - this.rect.top - this.size.h / 2;
          const scale = this.userAction ? 0.6 : 1;
          this.cursor?.style.setProperty(
            'transform',
            `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`
          );
        },
        { signal: this.signal }
      );
    }

    return this;
  }

  /**
   * Keeps the sprite sized to `frames * container width` and re-measures
   * whenever the element changes size or the page scrolls.
   */
  private observeResize(): void {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.el);

    // Keep the cached rect fresh on scroll (position changes, size does not).
    window.addEventListener('scroll', () => this.measure(), {
      passive: true,
      signal: this.signal,
    });
  }

  /**
   * Re-measures the element's size and position. Called automatically by the
   * ResizeObserver and on scroll, but can also be invoked manually.
   */
  resize(): this {
    if (this.image.offsetParent === null) return this;

    this.size = { w: this.el.offsetWidth, h: this.el.offsetHeight };
    this.frameWidth = this.size.w / this.settings.frames || 0;
    this.image.style.width = `${this.settings.frames * this.size.w}px`;
    this.measure();
    this.play(this.size.w * (this.oldFrame / this.settings.frames));

    return this;
  }

  /**
   * Caches the element's viewport offset. Cheap to call occasionally;
   * expensive to call on every pointermove, so it lives here.
   */
  private measure(): void {
    const r = this.el.getBoundingClientRect();
    this.rect = { left: r.left, top: r.top };
  }

  /**
   * Coalesces pointer input so the frame is updated at most once per
   * animation frame, no matter how fast pointermove fires.
   */
  private queuePlay(clientX: number): void {
    this.pendingX = clientX;
    if (this.pointerRafId) return;

    this.pointerRafId = window.requestAnimationFrame(() => {
      this.pointerRafId = 0;
      if (this.pendingX !== null) {
        this.play(this.pendingX - this.rect.left);
        this.pendingX = null;
      }
    });
  }

  /**
   * Calculates the current frame from an x coordinate and switches to it.
   */
  play(xcoord: number): this {
    if (!this.frameWidth) return this;

    this.switchFrame(Math.max(0, Math.floor(xcoord / this.frameWidth)));

    return this;
  }

  /**
   * Switches frame by translating the sprite (GPU-composited).
   */
  switchFrame(frame: number): this {
    if (frame !== this.oldFrame && frame < this.settings.frames) {
      this.image.style.transform = `translate3d(${-frame * this.size.w}px, 0, 0)`;
      this.oldFrame = frame;
    }

    return this;
  }
}
