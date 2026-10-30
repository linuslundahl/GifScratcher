export interface GifScratcherOptions {
    /** URL of a real animated .gif to decode and scrub */
    gif?: string;
    /** Autoplay the animation */
    auto?: boolean;
    /** Scrub by moving/dragging over the element */
    scrub?: boolean;
    /** Add a custom cursor element */
    cursor?: boolean;
    /** Render transport controls */
    player?: boolean;
    /** Playback speed multiplier */
    speed?: number;
}
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
export declare class GifScratcher {
    private readonly options;
    private readonly el;
    private frames;
    private frameDelay;
    private decoder;
    private playing;
    private autoRafId;
    private lastTick;
    private acc;
    private currentFrame;
    private hovering;
    private scrubbing;
    private canvas;
    private ctx;
    private cursor;
    private wrapper;
    private playerBar;
    private playBtn;
    private slider;
    private frameLabel;
    private readonly abort;
    private readonly signal;
    constructor(target: HTMLElement | string, options?: GifScratcherOptions);
    private init;
    /**
     * Removes all listeners, the cursor/player UI and the canvas.
     */
    destroy(): void;
    /**
     * Update options live, without re-decoding.
     */
    setOptions(options: Partial<GifScratcherOptions>): this;
    private decode;
    private decodeWithGifuct;
    private sizeCanvas;
    /** Render a frame (wraps around). */
    render(i: number): this;
    /** Start playback. */
    play(): this;
    /** Stop playback. */
    stop(): this;
    /** Rewind one frame. */
    rewind(): this;
    /** Forward one frame. */
    forward(): this;
    /** The current frame index. */
    get frame(): number;
    /** True while playing. */
    get isPlaying(): boolean;
    private bindInteraction;
    private scrubTo;
    private buildCursor;
    private ensureWrapper;
    private moveCursor;
    private teardownCursor;
    private buildPlayer;
    private syncPlayer;
    private teardownPlayer;
}
