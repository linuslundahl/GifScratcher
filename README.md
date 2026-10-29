GIF SCRATCHER
-------------
A lightweight dependency-free JavaScript library that allows you to scratch GIFs.

### DEMO

https://linuslundahl.github.io/GifScratcher/

### BUILD

The library is written in TypeScript. The only tool needed to build is the
TypeScript compiler:

    $ npm install
    $ npm run build    # compiles src/gifscratcher.ts -> dist/ and syncs docs/
    $ npm run watch    # recompile on change

### DOCUMENTATION

Add the first image in your animation to your HTML file.

	<div id="target" class="target">
  		<img src="animation-first.jpg">
	</div>

Then add the JavaScript magic.

	import { GifScratcher } from './dist/gifscratcher.js';

	new GifScratcher('#target', {
  		sprite : 'animation.jpg',
  		frames : 10
	});

Settings available.

	sprite      : string  // Image sprite
	frames      : int     // Number of frames in sprite
	interaction : string  // 'hover'         - Scratch on hover
	                      // 'drag'          - Scratch on drag
	auto        : bool    // Autoplay
	speed       : int     // Autoplay speed
	cursor      : boolean // Add custom cursor

### REPO STRUCTURE

	src/gifscratcher.ts   → library source (TypeScript)
	dist/                 → compiled output (npm run build, committed)
	docs/                 → the GitHub Pages site (published from main)
	  javascripts/        → built library, synced from dist/ on build
	  stylesheets/        → plain CSS
	  animations/         → demo sprite

The GitHub Pages demo is served from the `docs/` folder on the `main` branch.
`npm run build` recompiles the library into `dist/` and copies the built
`gifscratcher.js` into `docs/javascripts/`, so the published page always
matches the source. The demo sprite lives in `docs/animations/`.

### HELP

To extract every single frame from an animated GIF as individual JPEGs and create a sprite you can use ImageMagick in the terminal.

Install ImageMagick (macOS):

	$ brew install imagemagick

To extract the frames run:

	$ magick FILENAME.gif -coalesce %02d.jpg

To create the final sprite run:

	$ magick ??.jpg +append FILENAME.jpg
