/* =============================================================================

    Licensed under the MIT license.
    http://www.opensource.org/licenses/mit-license.php

   ============================================================================= */

/*! gifscratcher.js v0.2  (c) 2014 Linus Lundahl | MIT license */

/* ============================================================================= */

/* global jQuery:true */

/**
 * GifScratcher
 */
;(function ($) {
  'use strict';

  /**
   * RequestAnimationFrame polyfill
   */
  var requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
  }());

  /**
   * GifScratcher
   * @param {object} el
   * @param {object} settings
   */
  var GifScratcher = function (el, settings) {
    this.init(el, settings);
  };

  GifScratcher.prototype = {
    init : function (el, settings) {
      var _ = this;

      _.settings = $.extend({
        sprite      : '',
        frames      : 0,
        interaction : 'hover',
        auto        : true,
        cursor      : true,
        speed       : 5
      }, settings);

      _.$el               = $(el);
      _.$image            = _.$el.find('img');
      _.elSize            = {w: 0, h: 0};
      _.elPos             = _.$el.offset();
      _.oldFrame          = 0;
      _.iAuto             = 0;

      _.userAction        = false;
      _.stopOnAction      = false;
      _.cursorInteraction = true;

      _.$image.on('load', function () {
        _.elSize = {w: _.$el.width(), h: _.$el.height()};
      });

      if (_.settings.sprite) {
        _.$el.addClass('gifscratcher');
        _.$image.addClass('gs-img');

        // Preload sprite image
        _.preload(function () {
          // Listen for resize
          _.resize();

          // Do an initial resize for responsive purposes
          $(window).resize();

           // Add custom cursor
           _.addCursor();

           if (_.settings.auto) {
             _.stopOnAction = true;
             _.$el.addClass('gs-auto');
             _.auto();
           }

          // Test for touch device.
          // Source : http://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-handheld-device-in-jquery
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            _.cursorInteraction = false;
            _.$el.addClass('gs-touch');
            _.touchInteraction();
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
            }

            // Listen for hover
            _.hover();
          }
        });
      }

      return this;
    },

    /**
     * Appends a cursor div to the element.
     * @return {object}
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
     * Preloads the sprite.
     * @param  {string}  The sprite image URL.
     * @return {object}
     */
    preload : function (callback) {
      var _ = this;

      var img = new Image();
      img.src = _.settings.sprite;
      img.onload = function () {
        _.$image.attr({src : _.settings.sprite});
        if ($.isFunction(callback)) {
          callback();
        }
      };

      return this;
    },

    /**
     * Handles touch to interact with the animation.
     * @return {object}
     */
    touchInteraction : function () {
      var _ = this;

      _.$el.on('touchstart touchend', function (e) {
        _.userAction = (e.type === 'touchstart') ? true : false;
        _.$el.toggleClass('active');
      });

      $(window).on('touchmove', function (ev) {
        var e = ev.originalEvent;

        if (_.userAction) {
          e.preventDefault();
          _.play(e.targetTouches[0].pageX - _.elPos.left);
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
      var _ = this,
          delay = 0,
          auto;

      auto = function () {
        requestAnimFrame(auto);
        if ((_.stopOnAction && !_.userAction) && delay === _.settings.speed) {
          _.switchFrame(_.iAuto);
          _.iAuto = (_.iAuto >= _.settings.frames - 1) ? 0 : _.iAuto+1;
        }
        delay = (delay === _.settings.speed) ? 0 : delay+1;
      };
      auto();

      return this;
    },

    /**
     * Handle hover
     * @return {object}
     */
    hover : function () {
      var _ = this;

      $('body').on('mousemove', function (e) {
        if ((e.pageX >= _.elPos.left && e.pageX <= _.elPos.left + _.elSize.w) && (e.pageY >= _.elPos.top && e.pageY <= _.elPos.top + _.elSize.h)) {
          if (_.$cursor && _.cursorInteraction) {
            _.$cursor.css({
               left: e.pageX - _.elPos.left,
               top:  e.pageY - _.elPos.top
            });
          }

          if (!_.userAction) {
            _.$el.addClass('active');
            _.userAction = true;
          }
        } else {
          if (_.$cursor) {
            _.$cursor.removeAttr('style');
          }
          if (_.userAction) {
            _.$el.removeClass('active');
            _.userAction = false;
            _.iAuto = _.oldFrame;
          }
        }
      });

      return this;
    },

    /**
     * Handle browser resizes for responsive purposes
     * @return {object}
     */
    resize : function () {
      var _ = this;

      $(window).on('resize', function () {
        if (_.$image.is(':visible')) {
          _.elSize = {w: _.$el.width(), h: _.$el.height()};
          _.elPos  = _.$el.offset();
          _.play(0);
          _.$image.css({width : (_.settings.frames * _.elSize.w) + 'px'});
        }
      });

      return this;
    },

    /**
     * Calculates current frame and switches it
     * @param  {int}    xcoord The x coordinate from the element
     * @return {object}
     */
    play : function (xcoord) {
      var _ = this;

      _.switchFrame(Math.floor(xcoord / (Math.round((_.elSize.w / _.settings.frames) * 100)/100)));

      return this;
    },

    /**
     * Switches frame
     * @param  {int}    frame The frame number to switch to
     * @return {object}
     */
    switchFrame : function (frame) {
      var _ = this;

      if (frame !== _.oldFrame && frame < _.settings.frames) {
        _.$image.css({'margin-left' : '-' + (frame * _.elSize.w) + 'px'});
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
})(jQuery);
