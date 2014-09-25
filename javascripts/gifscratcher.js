/* global jQuery:true */

/**
 * GifScratcher
 */
;(function ($) {
  'use strict';

  var GifScratcher = function (el, settings) {
    this.init(el, settings);
  };

  GifScratcher.prototype = {
    init : function (el, settings) {
      var _ = this;

      _.settings          = $.extend($.fn.gifscratcher.defaults, settings);
      _.preloadImages     = [];

      _.$el               = $(el);
      _.$image            = _.$el.find('img');
      _.elWidth           = 0;
      _.elHeight          = 0;
      _.elPos             = _.$el.offset();
      _.iAuto             = 0;
      _.oldFrame          = 0;

      _.touchIsActive     = false;
      _.isHovering        = false;
      _.isTouchDevice     = false;
      _.stopOnHover       = false;
      _.stoppedByHover    = false;
      _.cursorInteraction = true;

      _.$image.load(function () {
        _.elWidth  = _.$el.width();
        _.elHeight = _.$el.height();
      });

      if (_.settings.images) {
        _.$el.addClass('gifscratcher');
        _.$image.addClass('gs-img');

        _.preload(); // Preload images
        _.resize();  // Listen for resize

         // Don't add a custom cursor for autoplaying GIFs
         if (_.settings.interaction === 'auto') {
          _.settings.cursor = false;
         }

         _.addCursor(); // Add custom cursor

        // Test for touch device.
        // Source : http://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-handheld-device-in-jquery
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && _.settings.interaction !== 'auto') {
          _.cursorInteraction = false;
          _.isTouchDevice     = true;
          _.$el.addClass('gs-touch');
          _.touchInteraction();
          _.touch(); // Listen for touch
        } else {
          switch (_.settings.interaction) {
            // Hover
            case 'hover':
              _.$el.addClass('gs-hover');
              _.hoverInteraction();
            break;

            // Drag
            case 'drag':
              _.$el.addClass('gs-drag');
              _.dragInteraction();
            break;

            // Auto
            case 'auto':
              _.$el.addClass('gs-auto');
              _.auto();
            break;

            // Auto with hover
            case 'autoWithHover':
              _.stopOnHover = true;
              _.$el.addClass('gs-auto-hover');
              _.auto().hoverInteraction();
            break;

            // Auto with drag
            case 'autoWithDrag':
              _.stopOnHover = true;
              _.$el.addClass('gs-auto-drag');
              _.auto().dragInteraction();
            break;
          }

          _.hover(); // Listen for hover
        }
    }

      return this;
    },

    /**
     * Appends a cursor div to the element.
     */
    addCursor : function () {
      var _ = this;

      if (_.settings.cursor) {
        _.$el.addClass('has-gs-cursor');
        _.$cursor = $('<div></div>').addClass('gs-cursor').appendTo(_.$el);
      }

      return this;
    },

    /**
     * Preloads images in the array.
     * @param  {array}  images The array of image URLs.
     * @return {object}
     */
    preload : function () {
      var _ = this;

      if (!_.preloadImages.list) {
          _.preloadImages.list = [];
      }

      for (var i = 0; i < _.settings.images.length; i++) {
        var img = new Image();
        img.onload = function () {
          var index = _.preloadImages.list.indexOf(this);
          if (index !== -1) {
            // remove this one from the array once it's loaded
            // for memory consumption reasons
            _.preloadImages.splice(index, 1);
          }
        };

        _.preloadImages.list.push(img);
        img.src = _.settings.images[i];
      }

      return this;
    },

    /**
     * Handles touch to interact with the animation.
     * @return {object}
     */
    touchInteraction : function () {
      var _ = this;

      _.$el.on('touchstart touchend', function (e) {
        _.touchIsActive = (e.type === 'touchstart') ? true : false;
      });

      $(window).on('touchmove', function (ev) {
        var e = ev.originalEvent;

        if (_.touchIsActive) {
          e.preventDefault();
          _.play(e.pageX - _.elPos.left);
        }
      });

      return this;
    },

    /**
     * Handles hover moving to interact with the animation.
     * @return {[type]} [description]
     */
    hoverInteraction : function () {
      var _ = this;

      _.$el.on('mousemove', function (e) {
        _.play(e.pageX - _.elPos.left);
      });

      return this;
    },

    /**
     * Handles dragging to interact with the animation.
     * @return {object}
     */
    dragInteraction : function () {
      var _ = this,
          dragging = false;

      document.ondragstart = function () { return false; };

      _.$cursor.on('mousedown mouseup', function (e) {
        e.preventDefault();
        dragging = (!dragging && e.type === 'mousedown') ? true : false;
      });

      _.$el.on('mousemove', function (e) {
        e.preventDefault();
        if (dragging) {
          _.play(e.clientX - _.elPos.left);
        }
      });

      return this;
    },

    /**
     * Handles autoplaying of the images
     * @return {object}
     */
    auto : function () {
      var _ = this;

      _.timer = setInterval(function() {
        if (_.stopOnHover && _.isHovering) {
          _.stoppedByHover = true;
          window.clearTimeout(_.timer);
        }
        _.iAuto++;
        if (_.iAuto >= _.settings.images.length) {
          _.iAuto = 0;
        }
        _.switchFrame(_.iAuto);
      }, _.settings.speed);

      return this;
    },

    /**
     * Handle hover
     * @return {object}
     */
    hover : function () {
      var _ = this;

      $('body').on('mousemove', function (e) {
        if ((e.pageX >= _.elPos.left && e.pageX <= _.elPos.left + _.elWidth) && (e.pageY >= _.elPos.top && e.pageY <= _.elPos.top + _.elHeight)) {
          if (_.$cursor && _.cursorInteraction) {
            _.$cursor.css({
               left: e.pageX - _.elPos.left,
               top:  e.pageY - _.elPos.top
            });
          }

          if (!_.isHovering) {
            _.$el.addClass('active');
            _.isHovering = true;
          }
        } else {
          if (_.$cursor) {
            _.$cursor.removeAttr('style');
          }
          if (_.isHovering) {
            _.$el.removeClass('active');
            _.isHovering = false;

            if (_.stoppedByHover) {
              _.iAuto = _.oldFrame;
              _.auto();
              _.stoppedByHover = false;
            }
          }
        }
      });

      return this;
    },

    /**
     * Handle touch
     * @return {object}
     */
    touch : function () {
      var _ = this;

      _.$el.on('touchstart touchend', function (e) {
        if (!_.isHovering) {
          _.$el.addClass('active');
          _.isHovering = true;
        } else {
          _.$el.removeClass('active');
          _.isHovering = false;
        }
      });

      return this;
    },

    /**
     * [resize description]
     * @return {[type]} [description]
     */
    resize : function () {
      var _ = this;

      $(window).on('resize', function () {
        _.elWidth  = _.$el.width();
        _.elHeight = _.$el.height();
        _.elPos    = _.$el.offset();
      });

      return this;
    },

    /**
     * [play description]
     * @param  {[type]} xcoord [description]
     * @return {[type]}        [description]
     */
    play : function (xcoord) {
      var _ = this;

      _.switchFrame(Math.floor(xcoord / (Math.round((_.elWidth / _.settings.images.length) * 100)/100)));

      return this;
    },

    /**
     * [switchFrame description]
     * @param  {[type]} xcoord [description]
     * @return {[type]}        [description]
     */
    switchFrame : function (frame) {
      var _ = this;

      if (frame !== _.oldFrame && frame <= (_.settings.images.length - 1)) {
        _.$image.attr({src : _.settings.images[frame]});
      }

      _.oldFrame = frame;

      return this;
    }
  };

  $.fn.gifscratcher = function (options) {
    var instance;

    instance = this.data('gifscratcher');
    if (!instance) {
      return this.each(function () {
        return $(this).data('gifscratcher', new GifScratcher(this, options));
      });
    }
    if (options === true) return instance;
    if ($.type(options) === 'string') instance[options]();
    return this;
  };

  $.fn.gifscratcher.defaults = {
    images      : [],
    interaction : 'hover',
    cursor      : true,
    speed       : 30
  };
})(jQuery);
