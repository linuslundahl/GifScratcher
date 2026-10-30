GIF SCRATCHER
-------------
A lightweight, dependency-free JavaScript library for 'scratching' GIFs. Drop the
built files from `dist/` onto your page — no build step or npm install required.

### DEMO

https://linuslundahl.github.io/GifScratcher/

### BUILD

The library is written in TypeScript. `tsc` compiles it and esbuild bundles it
(inlining the gifuct-js fallback) into a single self-contained module. The
widget stylesheet ships alongside it:

    $ npm install
    $ npm run build    # tsc -> build/, bundle+css -> dist/, sync docs/
    $ npm run watch    # recompile on change

### DOCUMENTATION

Link the widget stylesheet (it styles the cursor, canvas and player):

	<link rel="stylesheet" href="./dist/gifscratcher.css">

Put a real animated .gif inside the target as an `<img>` — with JavaScript
disabled it just shows the gif, and with JS enabled GifScratcher swaps it for a
canvas you can scrub, play, pause and step through:

	<div id="target">
  		<img src="animation.gif" alt="">
	</div>

	import { GifScratcher } from './dist/gifscratcher.js';

	new GifScratcher('#target');

You can also pass the source explicitly with `gif: 'animation.gif'` (it takes
precedence over the `<img>`).

Settings available.

	gif    : string  // Real .gif (optional if target has an <img>)
	auto   : bool    // Autoplay
	scrub  : bool    // Scrub on hover / drag
	cursor : boolean // Add custom cursor
	player : bool    // Show transport controls
	speed  : number  // Playback speed multiplier

Decoding uses the built-in ImageDecoder API where available (Chrome, Edge,
Opera) and falls back to a pure-JS parser (gifuct-js) on Firefox and Safari.

### Sprite version (standalone)

A separate, standalone sprite-strip variant is included as
`gifscratcher-sprite.js`. Instead of decoding a .gif it translates a pre-built
horizontal sprite strip (`<img>`) on the GPU — useful if you already have a
sprite or want to avoid decoding every frame into memory. The target element
must contain an <img>:

	<div id="target">
  		<img src="animation-first.jpg">
	</div>

	import { GifScratcherSprite } from './dist/gifscratcher-sprite.js';

	new GifScratcherSprite('#target', {
  		sprite : 'animation.jpg',
  		frames : 10
	});

Its settings: `sprite`, `frames`, `interaction` ('hover' | 'drag'), `auto`,
`cursor`, `speed`.

### REPO STRUCTURE

	src/gifscratcher.ts        → canvas .gif library (main)
	src/gifscratcher-sprite.ts → standalone sprite-strip variant
	src/gifscratcher.css       → widget stylesheet (cursor, canvas, player)
	build/                     → tsc intermediate output (gitignored)
	dist/                      → bundled modules + types + css (npm run build, committed)
	docs/                      → the GitHub Pages site (published from main)
	  javascripts/               → built canvas library, synced from dist/ on build
	  stylesheets/               → gifscratcher.css synced from dist/, plus demo style.css
	  animations/                → demo .gif

The GitHub Pages demo is served from the `docs/` folder on the `main` branch.
`npm run build` recompiles the library into `dist/` and copies the built
`gifscratcher.js` into `docs/javascripts/`, so the published page always
matches the source. The demo .gif lives in `docs/animations/`.

### HELP

To extract every single frame from an animated GIF as individual JPEGs and create a sprite you can use ImageMagick in the terminal.

Install ImageMagick (macOS):

	$ brew install imagemagick

To extract the frames run:

	$ magick FILENAME.gif -coalesce %02d.jpg

To create the final sprite run:

	$ magick ??.jpg +append FILENAME.jpg
