/* =============================================================================

    GifScratcher
    Licensed under the MIT license.
    http://www.opensource.org/licenses/mit-license.php

   ============================================================================= */
const DEFAULTS = {
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
 * @example
 * new GifScratcher('#target', { sprite: 'animation.jpg', frames: 10 });
 */
export class GifScratcher {
    constructor(target, options = {}) {
        this.cursor = null;
        this.size = { w: 0, h: 0 };
        this.oldFrame = 0;
        this.autoFrame = 0;
        this.userAction = false;
        this.abort = new AbortController();
        this.signal = this.abort.signal;
        this.resizeObserver = null;
        this.rafId = 0;
        const el = typeof target === 'string'
            ? document.querySelector(target)
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
    static get isTouchDevice() {
        return window.matchMedia('(hover: none), (pointer: coarse)').matches;
    }
    /**
     * Preloads the sprite, then wires up sizing, cursor and interaction.
     */
    setup() {
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
            }
            else {
                const mode = this.settings.interaction === 'drag' ? 'drag' : 'hover';
                this.el.classList.add(`gs-${mode}`);
                if (mode === 'drag') {
                    this.dragInteraction();
                }
                else {
                    this.hoverInteraction();
                }
                this.hover();
            }
        });
    }
    /**
     * Removes all listeners, observers, the cursor element and CSS classes.
     */
    destroy() {
        this.abort.abort();
        this.resizeObserver?.disconnect();
        window.cancelAnimationFrame(this.rafId);
        this.cursor?.remove();
        this.el.classList.remove('gifscratcher', 'has-gs-cursor', 'gs-auto', 'gs-touch', 'gs-hover', 'gs-drag', 'active');
        this.image.classList.remove('gs-img');
        this.image.removeAttribute('style');
    }
    /**
     * Appends a cursor div to the element.
     */
    addCursor() {
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
    preload(callback) {
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
    touchInteraction() {
        this.el.style.touchAction = 'none';
        this.el.addEventListener('pointerdown', () => {
            this.userAction = true;
            this.el.classList.add('active');
        }, { signal: this.signal });
        window.addEventListener('pointerup', () => {
            this.userAction = false;
            this.el.classList.remove('active');
        }, { signal: this.signal });
        this.el.addEventListener('pointermove', (e) => {
            if (this.userAction) {
                this.play(this.xPosition(e));
            }
        }, { signal: this.signal });
        return this;
    }
    /**
     * Hover interaction: moving over the element scratches.
     */
    hoverInteraction() {
        this.el.addEventListener('pointermove', (e) => this.play(this.xPosition(e)), {
            signal: this.signal,
        });
        return this;
    }
    /**
     * Drag interaction: press the cursor and move to scratch.
     */
    dragInteraction() {
        let dragging = false;
        this.el.style.touchAction = 'none';
        const dragTarget = this.cursor ?? this.el;
        dragTarget.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            dragging = true;
            this.el.setPointerCapture(e.pointerId);
        }, { signal: this.signal });
        this.el.addEventListener('pointerup', () => {
            dragging = false;
        }, { signal: this.signal });
        this.el.addEventListener('pointercancel', () => {
            dragging = false;
        }, { signal: this.signal });
        this.el.addEventListener('pointermove', (e) => {
            if (dragging) {
                this.play(this.xPosition(e));
            }
        }, { signal: this.signal });
        return this;
    }
    /**
     * Autoplays the animation until the user interacts.
     */
    auto() {
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
    hover() {
        this.el.addEventListener('pointerenter', () => {
            this.el.classList.add('active');
            this.userAction = true;
        }, { signal: this.signal });
        this.el.addEventListener('pointerleave', () => {
            this.el.classList.remove('active');
            this.userAction = false;
            this.autoFrame = this.oldFrame;
            this.cursor?.removeAttribute('style');
        }, { signal: this.signal });
        if (this.cursor) {
            this.el.addEventListener('pointermove', (e) => {
                const rect = this.el.getBoundingClientRect();
                this.cursor?.style.setProperty('left', `${e.clientX - rect.left}px`);
                this.cursor?.style.setProperty('top', `${e.clientY - rect.top}px`);
            }, { signal: this.signal });
        }
        return this;
    }
    /**
     * Keeps the sprite sized to `frames * container width` and re-measures
     * whenever the element changes size.
     */
    observeResize() {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.el);
    }
    /**
     * Re-measures the element. Called automatically by the ResizeObserver,
     * but can also be invoked manually.
     */
    resize() {
        if (this.image.offsetParent === null)
            return this;
        this.size = { w: this.el.offsetWidth, h: this.el.offsetHeight };
        this.image.style.width = `${this.settings.frames * this.size.w}px`;
        this.play(0);
        return this;
    }
    /**
     * Calculates the current frame from an x coordinate and switches to it.
     */
    play(xcoord) {
        if (!this.settings.frames || !this.size.w)
            return this;
        const frameWidth = Math.round((this.size.w / this.settings.frames) * 100) / 100;
        this.switchFrame(Math.max(0, Math.floor(xcoord / frameWidth)));
        return this;
    }
    /**
     * Switches frame by translating the sprite (GPU-composited).
     */
    switchFrame(frame) {
        if (frame !== this.oldFrame && frame < this.settings.frames) {
            this.image.style.transform = `translateX(${-frame * this.size.w}px)`;
            this.oldFrame = frame;
        }
        return this;
    }
    /**
     * X position of a pointer event relative to the element. Computed on
     * demand so it stays correct across scrolling and layout changes.
     */
    xPosition(e) {
        return e.clientX - this.el.getBoundingClientRect().left;
    }
}
//# sourceMappingURL=gifscratcher.js.map