GIF SCRATCHER
-------------
A lightweight dependency-free JavaScript library that allows you to scratch GIFs.

### DEMO

https://linuslundahl.github.io/GifScratcher/

### BUILD

The library is written in TypeScript. The only tool needed to build is the
TypeScript compiler:

    $ npm install
    $ npm run build    # compiles src/gifscratcher.ts -> javascripts/gifscratcher.js
    $ npm run watch    # recompile on change

### DOCUMENTATION

Add the first image in your animation to your HTML file.

	<div id="target" class="target">
  		<img src="animation-first.jpg">
	</div>

Then add the JavaScript magic.

	import { GifScratcher } from './javascripts/gifscratcher.js';

	new GifScratcher(document.querySelector('#target'), {
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

### HELP

To extract every single frame from an animated GIF as individual JPEGs and create a sprite you can use ImageMagick in the terminal.

Install ImageMagick (OS X):

	$ brew install imagemagick

To extract the frames run:

	$ magick FILENAME.gif -coalesce %02d.jpg

To create the final sprite run:

	$ montage `ls ??.jpg` -tile NUMBER_OF_FRAMESx1 -geometry 500x284 FILENAME.jpg
