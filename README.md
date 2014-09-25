GIF SCRATCHER
-------------
A lightweight (~4kb minified) jQuery plugin that allows you to scratch GIFs.

### DEMO

https://linuslundahl.github.io/GifScratcher/

### DOCUMENTATION

Add the first image in your animation to your HTML file.

	<div id="target" class="target">
  		<img src="frames/00.jpg">
	</div>

Then add the jQuery magic.

	$("#target").gifscratcher({
  		images : [
  			'frames/00.jpg',
  			'frames/01.jpg',
  			'frames/02.jpg',
  			...
  		]
	});

Settings available.

	images      : []      // Image array
	interaction : string  // 'hover'         - Scratch on hover
	                      // 'drag'          - Scratch on drag
                          // 'auto'          - Autoplay
                          // 'autoWithHover' - Autoplay with hover scratch
                          // 'autoWithDrag'  - Autoplay with drag scratch
	speed       : int     // Autoplay speed
	cursor      : boolean // Add custom cursor
### HELP

To extract every single frame from an animated GIF as individual JPEGs you can use ImageMagick in the terminal.

Install ImageMagick (OS X): `brew install imagemagick`

Then run: `convert FILENAME.gif -coalesce %02d.jpg` to extract the frames.
