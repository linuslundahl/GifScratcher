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
/**
 * GifScratcher — a dependency-free GIF "scratching" widget.
 *
 * @example
 * new GifScratcher('#target', { sprite: 'animation.jpg', frames: 10 });
 */
export declare class GifScratcher {
    private readonly settings;
    private readonly el;
    private readonly image;
    private cursor;
    private size;
    private oldFrame;
    private autoFrame;
    private userAction;
    private readonly abort;
    private readonly signal;
    private resizeObserver;
    private rafId;
    constructor(target: HTMLElement | string, options?: GifScratcherOptions);
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
     * whenever the element changes size.
     */
    private observeResize;
    /**
     * Re-measures the element. Called automatically by the ResizeObserver,
     * but can also be invoked manually.
     */
    resize(): this;
    /**
     * Calculates the current frame from an x coordinate and switches to it.
     */
    play(xcoord: number): this;
    /**
     * Switches frame by translating the sprite (GPU-composited).
     */
    switchFrame(frame: number): this;
    /**
     * X position of a pointer event relative to the element. Computed on
     * demand so it stays correct across scrolling and layout changes.
     */
    private xPosition;
}
