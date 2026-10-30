/*! gifscratcher-sprite.ts (c) Linus Lundahl | MIT license */
/**
 * GifScratcherSprite — the original sprite-strip "scratching" widget, kept as
 * a standalone alternative to the default canvas-based GifScratcher.
 *
 * Instead of decoding a .gif it translates a pre-built horizontal sprite strip
 * (`<img>`) on the GPU. Use this when you already have a sprite, or for very
 * large animations where decoding every frame into memory is undesirable.
 * See the README for the ImageMagick commands that build a sprite.
 *
 * @example
 * import { GifScratcherSprite } from './gifscratcher-sprite.js';
 * new GifScratcherSprite('#target', { sprite: 'animation.jpg', frames: 10 });
 */
export interface GifScratcherSpriteOptions {
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
/**
 * GifScratcherSprite — a dependency-free sprite "scratching" widget.
 *
 * Performance notes:
 * - Frame switching and cursor movement are GPU-composited `transform`s.
 * - The element's bounding rect is cached and only re-measured on
 *   resize/scroll, never inside pointermove handlers (avoids forced layout).
 * - Pointer input is coalesced and applied at most once per animation frame.
 *
 * @example
 * new GifScratcherSprite('#target', { sprite: 'animation.jpg', frames: 10 });
 */
export declare class GifScratcherSprite {
    private readonly settings;
    private readonly el;
    private readonly image;
    private cursor;
    private size;
    private rect;
    private frameWidth;
    private oldFrame;
    private autoFrame;
    private userAction;
    private pendingX;
    private pointerRafId;
    private readonly abort;
    private readonly signal;
    private resizeObserver;
    private rafId;
    constructor(target: HTMLElement | string, options?: GifScratcherSpriteOptions);
    /**
     * True on devices without hover capability (replaces UA sniffing).
     */
    private static get isTouchDevice();
    /**
     * Preloads the sprite, then wires up sizing, cursor and interaction.
     */
    private setup;
    /**
     * Removes all listeners, observers, the cursor element and CSS classes.
     */
    destroy(): void;
    /**
     * Appends a cursor div to the element.
     */
    addCursor(): this;
    /**
     * Preloads the sprite.
     */
    preload(callback?: () => void): this;
    /**
     * Touch interaction: press and move to scratch.
     */
    touchInteraction(): this;
    /**
     * Hover interaction: moving over the element scratches.
     */
    hoverInteraction(): this;
    /**
     * Drag interaction: press the cursor and move to scratch.
     */
    dragInteraction(): this;
    /**
     * Autoplays the animation until the user interacts.
     */
    auto(): this;
    /**
     * Tracks pointer enter/leave to toggle the active state and custom cursor.
     */
    hover(): this;
    /**
     * Keeps the sprite sized to `frames * container width` and re-measures
     * whenever the element changes size or the page scrolls.
     */
    private observeResize;
    /**
     * Re-measures the element's size and position. Called automatically by the
     * ResizeObserver and on scroll, but can also be invoked manually.
     */
    resize(): this;
    /**
     * Caches the element's viewport offset. Cheap to call occasionally;
     * expensive to call on every pointermove, so it lives here.
     */
    private measure;
    /**
     * Coalesces pointer input so the frame is updated at most once per
     * animation frame, no matter how fast pointermove fires.
     */
    private queuePlay;
    /**
     * Calculates the current frame from an x coordinate and switches to it.
     */
    play(xcoord: number): this;
    /**
     * Switches frame by translating the sprite (GPU-composited).
     */
    switchFrame(frame: number): this;
}
