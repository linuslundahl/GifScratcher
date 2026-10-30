var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/js-binary-schema-parser/lib/index.js
var require_lib = __commonJS({
  "node_modules/js-binary-schema-parser/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.loop = exports.conditional = exports.parse = void 0;
    var parse = function parse2(stream, schema) {
      var result = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      var parent = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : result;
      if (Array.isArray(schema)) {
        schema.forEach(function(partSchema) {
          return parse2(stream, partSchema, result, parent);
        });
      } else if (typeof schema === "function") {
        schema(stream, result, parent, parse2);
      } else {
        var key = Object.keys(schema)[0];
        if (Array.isArray(schema[key])) {
          parent[key] = {};
          parse2(stream, schema[key], result, parent[key]);
        } else {
          parent[key] = schema[key](stream, result, parent, parse2);
        }
      }
      return result;
    };
    exports.parse = parse;
    var conditional = function conditional2(schema, conditionFunc) {
      return function(stream, result, parent, parse2) {
        if (conditionFunc(stream, result, parent)) {
          parse2(stream, schema, result, parent);
        }
      };
    };
    exports.conditional = conditional;
    var loop = function loop2(schema, continueFunc) {
      return function(stream, result, parent, parse2) {
        var arr = [];
        var lastStreamPos = stream.pos;
        while (continueFunc(stream, result, parent)) {
          var newParent = {};
          parse2(stream, schema, result, newParent);
          if (stream.pos === lastStreamPos) {
            break;
          }
          lastStreamPos = stream.pos;
          arr.push(newParent);
        }
        return arr;
      };
    };
    exports.loop = loop;
  }
});

// node_modules/js-binary-schema-parser/lib/parsers/uint8.js
var require_uint8 = __commonJS({
  "node_modules/js-binary-schema-parser/lib/parsers/uint8.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.readBits = exports.readArray = exports.readUnsigned = exports.readString = exports.peekBytes = exports.readBytes = exports.peekByte = exports.readByte = exports.buildStream = void 0;
    var buildStream = function buildStream2(uint8Data) {
      return {
        data: uint8Data,
        pos: 0
      };
    };
    exports.buildStream = buildStream;
    var readByte = function readByte2() {
      return function(stream) {
        return stream.data[stream.pos++];
      };
    };
    exports.readByte = readByte;
    var peekByte = function peekByte2() {
      var offset = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
      return function(stream) {
        return stream.data[stream.pos + offset];
      };
    };
    exports.peekByte = peekByte;
    var readBytes = function readBytes2(length) {
      return function(stream) {
        return stream.data.subarray(stream.pos, stream.pos += length);
      };
    };
    exports.readBytes = readBytes;
    var peekBytes = function peekBytes2(length) {
      return function(stream) {
        return stream.data.subarray(stream.pos, stream.pos + length);
      };
    };
    exports.peekBytes = peekBytes;
    var readString = function readString2(length) {
      return function(stream) {
        return Array.from(readBytes(length)(stream)).map(function(value) {
          return String.fromCharCode(value);
        }).join("");
      };
    };
    exports.readString = readString;
    var readUnsigned = function readUnsigned2(littleEndian) {
      return function(stream) {
        var bytes = readBytes(2)(stream);
        return littleEndian ? (bytes[1] << 8) + bytes[0] : (bytes[0] << 8) + bytes[1];
      };
    };
    exports.readUnsigned = readUnsigned;
    var readArray = function readArray2(byteSize, totalOrFunc) {
      return function(stream, result, parent) {
        var total = typeof totalOrFunc === "function" ? totalOrFunc(stream, result, parent) : totalOrFunc;
        var parser = readBytes(byteSize);
        var arr = new Array(total);
        for (var i = 0; i < total; i++) {
          arr[i] = parser(stream);
        }
        return arr;
      };
    };
    exports.readArray = readArray;
    var subBitsTotal = function subBitsTotal2(bits, startIndex, length) {
      var result = 0;
      for (var i = 0; i < length; i++) {
        result += bits[startIndex + i] && Math.pow(2, length - i - 1);
      }
      return result;
    };
    var readBits = function readBits2(schema) {
      return function(stream) {
        var _byte = readByte()(stream);
        var bits = new Array(8);
        for (var i = 0; i < 8; i++) {
          bits[7 - i] = !!(_byte & 1 << i);
        }
        return Object.keys(schema).reduce(function(res, key) {
          var def = schema[key];
          if (def.length) {
            res[key] = subBitsTotal(bits, def.index, def.length);
          } else {
            res[key] = bits[def.index];
          }
          return res;
        }, {});
      };
    };
    exports.readBits = readBits;
  }
});

// node_modules/js-binary-schema-parser/lib/schemas/gif.js
var require_gif = __commonJS({
  "node_modules/js-binary-schema-parser/lib/schemas/gif.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = void 0;
    var _ = require_lib();
    var _uint = require_uint8();
    var subBlocksSchema = {
      blocks: function blocks(stream) {
        var terminator = 0;
        var chunks = [];
        var streamSize = stream.data.length;
        var total = 0;
        for (var size = (0, _uint.readByte)()(stream); size !== terminator; size = (0, _uint.readByte)()(stream)) {
          if (!size) break;
          if (stream.pos + size >= streamSize) {
            var availableSize = streamSize - stream.pos;
            chunks.push((0, _uint.readBytes)(availableSize)(stream));
            total += availableSize;
            break;
          }
          chunks.push((0, _uint.readBytes)(size)(stream));
          total += size;
        }
        var result = new Uint8Array(total);
        var offset = 0;
        for (var i = 0; i < chunks.length; i++) {
          result.set(chunks[i], offset);
          offset += chunks[i].length;
        }
        return result;
      }
    };
    var gceSchema = (0, _.conditional)({
      gce: [{
        codes: (0, _uint.readBytes)(2)
      }, {
        byteSize: (0, _uint.readByte)()
      }, {
        extras: (0, _uint.readBits)({
          future: {
            index: 0,
            length: 3
          },
          disposal: {
            index: 3,
            length: 3
          },
          userInput: {
            index: 6
          },
          transparentColorGiven: {
            index: 7
          }
        })
      }, {
        delay: (0, _uint.readUnsigned)(true)
      }, {
        transparentColorIndex: (0, _uint.readByte)()
      }, {
        terminator: (0, _uint.readByte)()
      }]
    }, function(stream) {
      var codes = (0, _uint.peekBytes)(2)(stream);
      return codes[0] === 33 && codes[1] === 249;
    });
    var imageSchema = (0, _.conditional)({
      image: [{
        code: (0, _uint.readByte)()
      }, {
        descriptor: [{
          left: (0, _uint.readUnsigned)(true)
        }, {
          top: (0, _uint.readUnsigned)(true)
        }, {
          width: (0, _uint.readUnsigned)(true)
        }, {
          height: (0, _uint.readUnsigned)(true)
        }, {
          lct: (0, _uint.readBits)({
            exists: {
              index: 0
            },
            interlaced: {
              index: 1
            },
            sort: {
              index: 2
            },
            future: {
              index: 3,
              length: 2
            },
            size: {
              index: 5,
              length: 3
            }
          })
        }]
      }, (0, _.conditional)({
        lct: (0, _uint.readArray)(3, function(stream, result, parent) {
          return Math.pow(2, parent.descriptor.lct.size + 1);
        })
      }, function(stream, result, parent) {
        return parent.descriptor.lct.exists;
      }), {
        data: [{
          minCodeSize: (0, _uint.readByte)()
        }, subBlocksSchema]
      }]
    }, function(stream) {
      return (0, _uint.peekByte)()(stream) === 44;
    });
    var textSchema = (0, _.conditional)({
      text: [{
        codes: (0, _uint.readBytes)(2)
      }, {
        blockSize: (0, _uint.readByte)()
      }, {
        preData: function preData(stream, result, parent) {
          return (0, _uint.readBytes)(parent.text.blockSize)(stream);
        }
      }, subBlocksSchema]
    }, function(stream) {
      var codes = (0, _uint.peekBytes)(2)(stream);
      return codes[0] === 33 && codes[1] === 1;
    });
    var applicationSchema = (0, _.conditional)({
      application: [{
        codes: (0, _uint.readBytes)(2)
      }, {
        blockSize: (0, _uint.readByte)()
      }, {
        id: function id(stream, result, parent) {
          return (0, _uint.readString)(parent.blockSize)(stream);
        }
      }, subBlocksSchema]
    }, function(stream) {
      var codes = (0, _uint.peekBytes)(2)(stream);
      return codes[0] === 33 && codes[1] === 255;
    });
    var commentSchema = (0, _.conditional)({
      comment: [{
        codes: (0, _uint.readBytes)(2)
      }, subBlocksSchema]
    }, function(stream) {
      var codes = (0, _uint.peekBytes)(2)(stream);
      return codes[0] === 33 && codes[1] === 254;
    });
    var schema = [
      {
        header: [{
          signature: (0, _uint.readString)(3)
        }, {
          version: (0, _uint.readString)(3)
        }]
      },
      {
        lsd: [{
          width: (0, _uint.readUnsigned)(true)
        }, {
          height: (0, _uint.readUnsigned)(true)
        }, {
          gct: (0, _uint.readBits)({
            exists: {
              index: 0
            },
            resolution: {
              index: 1,
              length: 3
            },
            sort: {
              index: 4
            },
            size: {
              index: 5,
              length: 3
            }
          })
        }, {
          backgroundColorIndex: (0, _uint.readByte)()
        }, {
          pixelAspectRatio: (0, _uint.readByte)()
        }]
      },
      (0, _.conditional)({
        gct: (0, _uint.readArray)(3, function(stream, result) {
          return Math.pow(2, result.lsd.gct.size + 1);
        })
      }, function(stream, result) {
        return result.lsd.gct.exists;
      }),
      // content frames
      {
        frames: (0, _.loop)([gceSchema, applicationSchema, commentSchema, imageSchema, textSchema], function(stream) {
          var nextCode = (0, _uint.peekByte)()(stream);
          return nextCode === 33 || nextCode === 44;
        })
      }
    ];
    var _default = schema;
    exports["default"] = _default;
  }
});

// node_modules/gifuct-js/lib/deinterlace.js
var require_deinterlace = __commonJS({
  "node_modules/gifuct-js/lib/deinterlace.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.deinterlace = void 0;
    var deinterlace = function deinterlace2(pixels, width) {
      var newPixels = new Array(pixels.length);
      var rows = pixels.length / width;
      var cpRow = function cpRow2(toRow2, fromRow2) {
        var fromPixels = pixels.slice(fromRow2 * width, (fromRow2 + 1) * width);
        newPixels.splice.apply(newPixels, [toRow2 * width, width].concat(fromPixels));
      };
      var offsets = [0, 4, 2, 1];
      var steps = [8, 8, 4, 2];
      var fromRow = 0;
      for (var pass = 0; pass < 4; pass++) {
        for (var toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
          cpRow(toRow, fromRow);
          fromRow++;
        }
      }
      return newPixels;
    };
    exports.deinterlace = deinterlace;
  }
});

// node_modules/gifuct-js/lib/lzw.js
var require_lzw = __commonJS({
  "node_modules/gifuct-js/lib/lzw.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.lzw = void 0;
    var lzw = function lzw2(minCodeSize, data, pixelCount) {
      var MAX_STACK_SIZE = 4096;
      var nullCode = -1;
      var npix = pixelCount;
      var available, clear, code_mask, code_size, end_of_information, in_code, old_code, bits, code, i, datum, data_size, first, top, bi, pi;
      var dstPixels = new Array(pixelCount);
      var prefix = new Array(MAX_STACK_SIZE);
      var suffix = new Array(MAX_STACK_SIZE);
      var pixelStack = new Array(MAX_STACK_SIZE + 1);
      data_size = minCodeSize;
      clear = 1 << data_size;
      end_of_information = clear + 1;
      available = clear + 2;
      old_code = nullCode;
      code_size = data_size + 1;
      code_mask = (1 << code_size) - 1;
      for (code = 0; code < clear; code++) {
        prefix[code] = 0;
        suffix[code] = code;
      }
      var datum, bits, count, first, top, pi, bi;
      datum = bits = count = first = top = pi = bi = 0;
      for (i = 0; i < npix; ) {
        if (top === 0) {
          if (bits < code_size) {
            datum += data[bi] << bits;
            bits += 8;
            bi++;
            continue;
          }
          code = datum & code_mask;
          datum >>= code_size;
          bits -= code_size;
          if (code > available || code == end_of_information) {
            break;
          }
          if (code == clear) {
            code_size = data_size + 1;
            code_mask = (1 << code_size) - 1;
            available = clear + 2;
            old_code = nullCode;
            continue;
          }
          if (old_code == nullCode) {
            pixelStack[top++] = suffix[code];
            old_code = code;
            first = code;
            continue;
          }
          in_code = code;
          if (code == available) {
            pixelStack[top++] = first;
            code = old_code;
          }
          while (code > clear) {
            pixelStack[top++] = suffix[code];
            code = prefix[code];
          }
          first = suffix[code] & 255;
          pixelStack[top++] = first;
          if (available < MAX_STACK_SIZE) {
            prefix[available] = old_code;
            suffix[available] = first;
            available++;
            if ((available & code_mask) === 0 && available < MAX_STACK_SIZE) {
              code_size++;
              code_mask += available;
            }
          }
          old_code = in_code;
        }
        top--;
        dstPixels[pi++] = pixelStack[top];
        i++;
      }
      for (i = pi; i < npix; i++) {
        dstPixels[i] = 0;
      }
      return dstPixels;
    };
    exports.lzw = lzw;
  }
});

// node_modules/gifuct-js/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/gifuct-js/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.decompressFrames = exports.decompressFrame = exports.parseGIF = void 0;
    var _gif = _interopRequireDefault(require_gif());
    var _jsBinarySchemaParser = require_lib();
    var _uint = require_uint8();
    var _deinterlace = require_deinterlace();
    var _lzw = require_lzw();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    var parseGIF = function parseGIF2(arrayBuffer) {
      var byteData = new Uint8Array(arrayBuffer);
      return (0, _jsBinarySchemaParser.parse)((0, _uint.buildStream)(byteData), _gif["default"]);
    };
    exports.parseGIF = parseGIF;
    var generatePatch = function generatePatch2(image) {
      var totalPixels = image.pixels.length;
      var patchData = new Uint8ClampedArray(totalPixels * 4);
      for (var i = 0; i < totalPixels; i++) {
        var pos = i * 4;
        var colorIndex = image.pixels[i];
        var color = image.colorTable[colorIndex] || [0, 0, 0];
        patchData[pos] = color[0];
        patchData[pos + 1] = color[1];
        patchData[pos + 2] = color[2];
        patchData[pos + 3] = colorIndex !== image.transparentIndex ? 255 : 0;
      }
      return patchData;
    };
    var decompressFrame = function decompressFrame2(frame, gct, buildImagePatch) {
      if (!frame.image) {
        console.warn("gif frame does not have associated image.");
        return;
      }
      var image = frame.image;
      var totalPixels = image.descriptor.width * image.descriptor.height;
      var pixels = (0, _lzw.lzw)(image.data.minCodeSize, image.data.blocks, totalPixels);
      if (image.descriptor.lct.interlaced) {
        pixels = (0, _deinterlace.deinterlace)(pixels, image.descriptor.width);
      }
      var resultImage = {
        pixels,
        dims: {
          top: frame.image.descriptor.top,
          left: frame.image.descriptor.left,
          width: frame.image.descriptor.width,
          height: frame.image.descriptor.height
        }
      };
      if (image.descriptor.lct && image.descriptor.lct.exists) {
        resultImage.colorTable = image.lct;
      } else {
        resultImage.colorTable = gct;
      }
      if (frame.gce) {
        resultImage.delay = (frame.gce.delay || 10) * 10;
        resultImage.disposalType = frame.gce.extras.disposal;
        if (frame.gce.extras.transparentColorGiven) {
          resultImage.transparentIndex = frame.gce.transparentColorIndex;
        }
      }
      if (buildImagePatch) {
        resultImage.patch = generatePatch(resultImage);
      }
      return resultImage;
    };
    exports.decompressFrame = decompressFrame;
    var decompressFrames = function decompressFrames2(parsedGif, buildImagePatches) {
      return parsedGif.frames.filter(function(f) {
        return f.image;
      }).map(function(f) {
        return decompressFrame(f, parsedGif.gct, buildImagePatches);
      });
    };
    exports.decompressFrames = decompressFrames;
  }
});

// build/gifscratcher.js
var DEFAULTS = {
  gif: "",
  auto: true,
  scrub: true,
  cursor: true,
  player: false,
  speed: 1
};
var GifScratcher = class {
  constructor(target, options = {}) {
    this.frames = [];
    this.frameDelay = 100;
    this.decoder = "";
    this.playing = false;
    this.autoRafId = 0;
    this.lastTick = 0;
    this.acc = 0;
    this.currentFrame = 0;
    this.hovering = false;
    this.scrubbing = false;
    this.canvas = null;
    this.ctx = null;
    this.cursor = null;
    this.wrapper = null;
    this.playerBar = null;
    this.playBtn = null;
    this.slider = null;
    this.frameLabel = null;
    this.abort = new AbortController();
    this.signal = this.abort.signal;
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) {
      throw new Error(`GifScratcher: no element found for "${target}".`);
    }
    this.el = el;
    this.options = { ...DEFAULTS, ...options };
    if (!this.options.gif) {
      throw new Error("GifScratcher: a `gif` source is required.");
    }
    this.el.classList.add("gifscratcher");
    this.init();
  }
  /* ========================================================================
     Setup / teardown
     ===================================================================== */
  async init() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "gs-canvas";
    this.ctx = this.canvas.getContext("2d");
    this.el.appendChild(this.canvas);
    try {
      const buf = await (await fetch(this.options.gif)).arrayBuffer();
      this.frames = await this.decode(buf);
      this.sizeCanvas();
      if (this.options.cursor)
        this.buildCursor();
      if (this.options.player)
        this.buildPlayer();
      this.bindInteraction();
      this.render(0);
      if (this.options.auto)
        this.play();
      this.el.dispatchEvent(new CustomEvent("gifscratcher:ready", {
        detail: { frames: this.frames.length, decoder: this.decoder }
      }));
    } catch (err) {
      console.error("GifScratcher:", err);
      this.el.dispatchEvent(new CustomEvent("gifscratcher:error", { detail: { error: err } }));
    }
  }
  /**
   * Removes all listeners, the cursor/player UI and the canvas.
   */
  destroy() {
    this.abort.abort();
    window.cancelAnimationFrame(this.autoRafId);
    this.cursor?.remove();
    this.teardownPlayer();
    this.frames.forEach((f) => f.close?.());
    this.frames = [];
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
    this.el.classList.remove("gifscratcher", "has-gs-cursor", "active");
  }
  /**
   * Update options live, without re-decoding.
   */
  setOptions(options) {
    const prev = { ...this.options };
    Object.assign(this.options, options);
    if (options.player !== void 0 && options.player !== prev.player) {
      if (options.player && this.frames.length)
        this.buildPlayer();
      else
        this.teardownPlayer();
    }
    if (options.cursor !== void 0 && options.cursor !== prev.cursor) {
      if (options.cursor)
        this.buildCursor();
      else
        this.teardownCursor();
    }
    if (options.auto !== void 0 && options.auto !== prev.auto) {
      if (options.auto && !this.hovering)
        this.play();
      else if (!options.auto)
        this.stop();
    }
    return this;
  }
  /* ========================================================================
     Decoding
     ===================================================================== */
  async decode(buf) {
    if ("ImageDecoder" in window) {
      const decoder = new ImageDecoder({ data: buf, type: "image/gif" });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const out = [];
      const count = track?.frameCount ?? 0;
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        out.push(image);
        if (i === 0 && image.duration)
          this.frameDelay = image.duration / 1e3;
      }
      this.decoder = "ImageDecoder";
      return out;
    }
    return this.decodeWithGifuct(buf);
  }
  async decodeWithGifuct(buf) {
    const { parseGIF, decompressFrames } = await Promise.resolve().then(() => __toESM(require_lib2(), 1));
    const gif = parseGIF(buf);
    const raw = decompressFrames(gif, true);
    if (!raw.length)
      throw new Error("gifuct-js decoded zero frames.");
    const { width, height } = raw[0].dims;
    const comp = document.createElement("canvas");
    comp.width = width;
    comp.height = height;
    const cctx = comp.getContext("2d");
    const patch = document.createElement("canvas");
    const pctx = patch.getContext("2d");
    const out = [];
    for (const f of raw) {
      const { width: w, height: h, top, left } = f.dims;
      if (f.delay)
        this.frameDelay = f.delay;
      patch.width = w;
      patch.height = h;
      pctx.putImageData(new ImageData(new Uint8ClampedArray(f.patch), w, h), 0, 0);
      cctx.drawImage(patch, left, top);
      out.push(await createImageBitmap(comp));
      if (f.disposalType === 2) {
        cctx.clearRect(left, top, w, h);
      }
    }
    this.decoder = "gifuct-js";
    return out;
  }
  sizeCanvas() {
    if (!this.canvas || !this.frames.length)
      return;
    const f0 = this.frames[0];
    this.canvas.width = f0.displayWidth || f0.codedWidth || f0.width;
    this.canvas.height = f0.displayHeight || f0.codedHeight || f0.height;
  }
  /* ========================================================================
     Playback
     ===================================================================== */
  /** Render a frame (wraps around). */
  render(i) {
    if (!this.frames.length || !this.ctx || !this.canvas)
      return this;
    const n = this.frames.length;
    this.currentFrame = (i % n + n) % n;
    this.ctx.drawImage(this.frames[this.currentFrame], 0, 0, this.canvas.width, this.canvas.height);
    if (this.slider)
      this.slider.value = String(this.currentFrame);
    if (this.frameLabel)
      this.frameLabel.textContent = `${this.currentFrame + 1}/${n}`;
    return this;
  }
  /** Start playback. */
  play() {
    if (this.playing)
      return this;
    this.playing = true;
    this.syncPlayer();
    this.lastTick = performance.now();
    const step = (now) => {
      if (!this.playing)
        return;
      this.autoRafId = window.requestAnimationFrame(step);
      this.acc += now - this.lastTick;
      this.lastTick = now;
      const interval = this.frameDelay / Math.max(0.1, this.options.speed);
      while (this.acc >= interval) {
        this.acc -= interval;
        this.render(this.currentFrame + 1);
      }
    };
    this.autoRafId = window.requestAnimationFrame(step);
    return this;
  }
  /** Stop playback. */
  stop() {
    this.playing = false;
    window.cancelAnimationFrame(this.autoRafId);
    this.syncPlayer();
    return this;
  }
  /** Rewind one frame. */
  rewind() {
    return this.render(this.currentFrame - 1);
  }
  /** Forward one frame. */
  forward() {
    return this.render(this.currentFrame + 1);
  }
  /** The current frame index. */
  get frame() {
    return this.currentFrame;
  }
  /** True while playing. */
  get isPlaying() {
    return this.playing;
  }
  /* ========================================================================
     Interaction (hover / drag scrub + custom cursor)
     ===================================================================== */
  bindInteraction() {
    const c = this.canvas;
    c.style.touchAction = "none";
    c.addEventListener("pointerenter", () => {
      this.hovering = true;
      if (this.options.auto)
        this.stop();
      this.wrapper?.classList.add("active");
      this.el.classList.add("active");
    }, { signal: this.signal });
    c.addEventListener("pointermove", (e) => {
      if (this.options.scrub)
        this.scrubTo(e.clientX);
      this.moveCursor(e.clientX, e.clientY);
    }, { signal: this.signal });
    c.addEventListener("pointerleave", () => {
      this.hovering = false;
      if (this.options.auto && !this.scrubbing)
        this.play();
      this.wrapper?.classList.remove("active");
      this.el.classList.remove("active");
      if (this.cursor)
        this.cursor.style.transform = "";
    }, { signal: this.signal });
    let dragging = false;
    c.addEventListener("pointerdown", (e) => {
      if (!this.options.scrub)
        return;
      dragging = true;
      this.scrubbing = true;
      this.stop();
      c.setPointerCapture(e.pointerId);
      this.scrubTo(e.clientX);
    }, { signal: this.signal });
    c.addEventListener("pointermove", (e) => {
      if (dragging && this.options.scrub)
        this.scrubTo(e.clientX);
    }, { signal: this.signal });
    const endDrag = () => {
      dragging = false;
      this.scrubbing = false;
    };
    c.addEventListener("pointerup", endDrag, { signal: this.signal });
    c.addEventListener("pointercancel", endDrag, { signal: this.signal });
  }
  scrubTo(clientX) {
    if (!this.frames.length)
      return;
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    this.render(Math.floor(x / rect.width * this.frames.length));
  }
  /* ========================================================================
     Custom cursor
     ===================================================================== */
  buildCursor() {
    if (this.cursor || !this.options.cursor)
      return;
    this.ensureWrapper();
    this.cursor = document.createElement("div");
    this.cursor.className = "gs-cursor";
    this.cursor.setAttribute("aria-hidden", "true");
    this.wrapper.appendChild(this.cursor);
    this.wrapper.classList.add("has-gs-cursor");
    this.el.classList.add("has-gs-cursor");
  }
  ensureWrapper() {
    if (this.wrapper || !this.canvas)
      return;
    const w = document.createElement("div");
    w.className = "gs-wrap";
    this.canvas.parentNode?.insertBefore(w, this.canvas);
    w.appendChild(this.canvas);
    this.wrapper = w;
  }
  moveCursor(clientX, clientY) {
    if (!this.cursor)
      return;
    const rect = this.canvas.getBoundingClientRect();
    const dx = clientX - rect.left - rect.width / 2;
    const dy = clientY - rect.top - rect.height / 2;
    const scale = this.hovering ? 0.85 : 1;
    this.cursor.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(${scale})`;
  }
  teardownCursor() {
    this.cursor?.remove();
    this.cursor = null;
    this.wrapper?.classList.remove("has-gs-cursor", "active");
    this.el.classList.remove("has-gs-cursor");
  }
  /* ========================================================================
     Player UI
     ===================================================================== */
  buildPlayer() {
    if (this.playerBar)
      return;
    const bar = document.createElement("div");
    bar.className = "gs-player";
    const mk = (label, title, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = label;
      b.title = title;
      b.addEventListener("click", onClick, { signal: this.signal });
      return b;
    };
    this.playBtn = mk("Play", "Play / pause", () => this.playing ? this.stop() : this.play());
    const rew = mk("&#9198;", "Rewind one frame", () => {
      this.stop();
      this.rewind();
    });
    const fwd = mk("&#9197;", "Forward one frame", () => {
      this.stop();
      this.forward();
    });
    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.min = "0";
    this.slider.max = String(this.frames.length - 1);
    this.slider.step = "1";
    this.slider.value = "0";
    this.slider.addEventListener("input", () => {
      this.stop();
      this.render(Number(this.slider.value));
    }, { signal: this.signal });
    this.frameLabel = document.createElement("span");
    this.frameLabel.className = "gs-frame";
    bar.append(this.playBtn, rew, fwd, this.slider, this.frameLabel);
    (this.wrapper ?? this.canvas).insertAdjacentElement("afterend", bar);
    this.playerBar = bar;
    this.syncPlayer();
  }
  syncPlayer() {
    if (this.playBtn) {
      this.playBtn.textContent = this.playing ? "Pause" : "Play";
      this.playBtn.setAttribute("aria-pressed", String(this.playing));
    }
  }
  teardownPlayer() {
    this.playerBar?.remove();
    this.playerBar = null;
    this.playBtn = null;
    this.slider = null;
    this.frameLabel = null;
  }
};
export {
  GifScratcher
};
//# sourceMappingURL=gifscratcher.js.map
