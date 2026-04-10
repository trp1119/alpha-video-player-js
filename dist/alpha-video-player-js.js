/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var VSHADER_SOURCE = "#define GLSLIFY 1\nattribute vec4 a_Position;attribute vec2 a_Video_Texture_Position;attribute vec2 a_Alpha_Video_Texture_Position;varying vec2 v_Video_Texture_Position;varying vec2 v_Alpha_Video_Texture_Position;void main(){gl_Position=a_Position;v_Video_Texture_Position=a_Video_Texture_Position;v_Alpha_Video_Texture_Position=a_Alpha_Video_Texture_Position;}"; // eslint-disable-line

var FSHADER_SOURCE = "precision lowp float;\n#define GLSLIFY 1\nuniform sampler2D u_Sampler;varying vec2 v_Video_Texture_Position;varying vec2 v_Alpha_Video_Texture_Position;void main(){gl_FragColor=vec4(texture2D(u_Sampler,v_Video_Texture_Position).rgb,texture2D(u_Sampler,v_Alpha_Video_Texture_Position).r);}"; // eslint-disable-line

/**
 * 设备像素比（惰性取值，SSR 安全）
 */
var getDpr = function () { return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1; };
/**
 * 是否支持 canvas2d
 */
var supportCanvas2d = function () {
    var canvas = document.createElement('canvas');
    return !!canvas.getContext('2d');
};
/**
 * 是否支持 webgl
 */
var supportWebGL = function () {
    var canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
};
/**
 * 创建画布
 * @param container 容器
 * @returns 画布
 */
var initCanvas = function (container, width, height) {
    var offsetWidth = container.offsetWidth, offsetHeight = container.offsetHeight;
    var dpr = getDpr();
    var resolvedWidth = width || offsetWidth;
    var resolvedHeight = height || offsetHeight;
    if (!resolvedWidth || !resolvedHeight) {
        console.warn('[alpha-video-player-js]: container size is 0. ' +
            'Make sure the container is mounted and has a non-zero size before creating the player.');
    }
    var canvas = document.createElement('canvas');
    canvas.width = resolvedWidth * dpr;
    canvas.height = resolvedHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);
    return canvas;
};
/**
 * 根据视频原始尺寸和 orientation 计算显示区域宽高比。
 * alpha 合并视频中，landscape 时左右各半（实际宽 = videoWidth / 2），
 * portrait 时上下各半（实际高 = videoHeight / 2）。
 */
var computeDisplayRatio = function (videoWidth, videoHeight, orientation) {
    var displayWidth = orientation === 'landscape' ? videoWidth / 2 : videoWidth;
    var displayHeight = orientation === 'portrait' ? videoHeight / 2 : videoHeight;
    return displayWidth / displayHeight;
};
/**
 * 重新设置 canvas 的像素尺寸（不改变 CSS 尺寸和 DOM 结构）
 */
var resizeCanvas = function (canvas, width, height) {
    var dpr = getDpr();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
};
var DEFINE_COORDS = {
    landscape: {
        front: [
            0, 1,
            0.5, 1,
            0, 0,
            0.5, 0
        ],
        back: [
            0.5, 1,
            1, 1,
            0.5, 0,
            1, 0
        ]
    },
    portrait: {
        front: [
            0, 1,
            1, 1,
            0, 0.5,
            1, 0.5
        ],
        back: [
            0, 0.5,
            1, 0.5,
            0, 0,
            1, 0
        ]
    }
};
/**
 * 计算渲染坐标
 * @param orientation 视频排布方式
 * @param side RGB 通道视频位置
 */
var computeVertexCoord = function (orientation, side) {
    var isFront = side === 'front';
    var vertexCoords = [
        -1, 1,
        1, 1,
        -1, -1,
        1, -1
    ];
    var textureCoords = DEFINE_COORDS[orientation][isFront ? 'front' : 'back'];
    var alphaTextureCoords = DEFINE_COORDS[orientation][!isFront ? 'front' : 'back'];
    var combineCoords = [];
    vertexCoords.forEach(function (i, index) {
        if (index % 2 === 0) {
            combineCoords = combineCoords
                .concat(vertexCoords.slice(index, index + 2))
                .concat(textureCoords.slice(index, index + 2))
                .concat(alphaTextureCoords.slice(index, index + 2));
        }
    });
    return new Float32Array(combineCoords);
};
var IMAGE_COORDS_MAP = {
    'landscape_front': function (w, h) { return [0, 0, w, h]; },
    'landscape_back': function (w, h) { return [w, 0, w, h]; },
    'portrait_front': function (w, h) { return [0, 0, w, h]; },
    'portrait_back': function (w, h) { return [0, h, w, h]; },
};
/**
 * 计算画布图片渲染位置
 * @param orientation 视频排布位置
 * @param side 视频
 * @param width 画布宽
 * @param height 画布高
 */
var computeImageCoord = function (orientation, side, width, height) {
    var otherSide = side === 'front' ? 'back' : 'front';
    var imageCoords = IMAGE_COORDS_MAP["".concat(orientation, "_").concat(side)](width, height);
    var alhpaImageCoords = IMAGE_COORDS_MAP["".concat(orientation, "_").concat(otherSide)](width, height);
    return { imageCoords: imageCoords, alhpaImageCoords: alhpaImageCoords };
};
/**
 * 计算临时画布尺寸
 * @param orientation 视频排布位置
 * @param type 尺寸类型
 * @param size 尺寸
 */
var computeSize = function (orientation, type, size) {
    if (orientation === 'landscape') {
        return type === 'width' ? size * 2 : size;
    }
    else {
        return type === 'width' ? size : size * 2;
    }
};
/**
 * 判断视频是否存在
 * @param video 视频
 */
var videoExists = function (video) {
    if (!video) {
        throw new Error('[alpha-video-player-js]: setting failed, please instantiate first!');
    }
};
/**
 * requestAnimationFrame（惰性取值，SSR 安全）
 */
var getRequestAnimationFrame = function () {
    if (typeof window === 'undefined')
        return null;
    var w = window;
    return w.requestAnimationFrame ||
        w.webkitRequestAnimationFrame ||
        w.mozRequestAnimationFrame ||
        w.oRequestAnimationFrame ||
        w.msRequestAnimationFrame ||
        null;
};
/**
 * cancelAnimationFrame（惰性取值，SSR 安全）
 */
var getCancelAnimationFrame = function () {
    if (typeof window === 'undefined')
        return null;
    var w = window;
    return w.cancelAnimationFrame ||
        w.mozCancelAnimationFrame ||
        w.webkitCancelAnimationFrame ||
        w.msCancelAnimationFrame ||
        null;
};

var DEFAULT_CONFIG = {
    playbackRate: 1,
    muted: true,
    loop: false,
    fps: 0,
    orientation: 'landscape',
    side: 'front',
    autoShow: false,
    autoClear: true,
    autoDestroy: false,
    debug: false,
    videoFrame: false,
};
var Video = /** @class */ (function () {
    function Video(config) {
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.videoWidth = 0;
        this.videoHeight = 0;
        this.animationId = 0;
        this.onCanPlayTimes = 1;
        this.canPlay = false;
        this.adaptAnimation = null;
        this.playing = false;
        if (!config.container) {
            throw new Error('[alpha-video-player-js]: container can not be empty！');
        }
        this.setConfig(config);
        this.container = config.container;
        if (!this.isAdaptiveMode()) {
            this.createCanvas();
        }
        this.initVideo();
    }
    /**
     * 只传了 width 或 height 中的一个 → 需要等视频尺寸才能确定另一维度
     */
    Video.prototype.isAdaptiveMode = function () {
        var _a = this.config, width = _a.width, height = _a.height;
        var hasW = width != null && width > 0;
        var hasH = height != null && height > 0;
        return (hasW && !hasH) || (!hasW && hasH);
    };
    Video.prototype.createCanvas = function () {
        var _a = this.resolveCanvasSize(), width = _a.width, height = _a.height;
        this.canvas = initCanvas(this.container, width, height);
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
    };
    Object.defineProperty(Video.prototype, "loop", {
        get: function () {
            var _a;
            return ((_a = this.video) === null || _a === void 0 ? void 0 : _a.loop) || false;
        },
        enumerable: false,
        configurable: true
    });
    Video.prototype.setConfig = function (config) {
        if (!config)
            return;
        this.config = Object.assign({}, DEFAULT_CONFIG, this.config || {}, config);
    };
    Video.prototype.initVideo = function () {
        var _a = this.config, src = _a.src, playbackRate = _a.playbackRate, muted = _a.muted, loop = _a.loop, crossOrigin = _a.crossOrigin;
        var video = this.video = document.createElement('video');
        video.crossOrigin = crossOrigin !== null && crossOrigin !== void 0 ? crossOrigin : 'anonymous';
        video.autoplay = false;
        video.preload = 'auto';
        video.playbackRate = playbackRate;
        video.loop = loop;
        video.muted = muted;
        if (muted) {
            video.setAttribute('muted', '');
        }
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('x-webkit-airplay', '');
        video.style.position = 'absolute';
        video.style.width = '0';
        video.style.height = '0';
        video.style.overflow = 'hidden';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);
        this.bindInstance();
        this.addEvent();
        if (src) {
            video.src = src;
            video.load();
        }
    };
    /**
     * 绘制一帧
     */
    Video.prototype.drawFrameOnce = function () { };
    /**
     * 逐帧绘制当前视频内容
     */
    Video.prototype.drawFrame = function () {
        var drawFrame = this.drawFrame.bind(this);
        if (!this.adaptAnimation) {
            this.adaptAnimation = this.initAdaptAnimation();
        }
        this.animationId = this.adaptAnimation(drawFrame);
        this.playing = true;
    };
    Video.prototype.initAdaptAnimation = function () {
        var _this = this;
        var _a = this.config, videoFrame = _a.videoFrame, fps = _a.fps;
        var rAF = getRequestAnimationFrame();
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoFrame) {
            return function (cb) { return _this.video.requestVideoFrameCallback(cb); };
        }
        else if (rAF) {
            if (fps) {
                var frame_1 = -1;
                return function (cb) {
                    frame_1++;
                    return rAF(function () {
                        if (frame_1 % (60 / fps) === 0) {
                            return cb();
                        }
                        else {
                            _this.animationId = _this.adaptAnimation(cb);
                        }
                    });
                };
            }
            else {
                return function (cb) { return rAF(cb); };
            }
        }
        else {
            var interval_1 = fps > 0 ? 1000 / fps : 16;
            return function (cb) { return window.setTimeout(cb, interval_1); };
        }
    };
    /**
     * 取消逐帧绘制
     */
    Video.prototype.cancelDrawFrame = function () {
        var _a;
        var _b = this, animationId = _b.animationId, config = _b.config;
        if (!animationId) {
            return;
        }
        var cAF = getCancelAnimationFrame();
        if (((_a = this.video) === null || _a === void 0 ? void 0 : _a.cancelVideoFrameCallback) && config.videoFrame) {
            this.video.cancelVideoFrameCallback(animationId);
        }
        else if (cAF) {
            cAF(animationId);
        }
        else {
            window.clearTimeout(animationId);
        }
        this.animationId = 0;
        this.playing = false;
    };
    /**
     * 播放
     */
    Video.prototype.play = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_1, errorEvent;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        videoExists(this.video);
                        config && this.setConfig(config);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.video.play()];
                    case 2:
                        res = _c.sent();
                        this.drawFrame();
                        return [2 /*return*/, res];
                    case 3:
                        error_1 = _c.sent();
                        errorEvent = new ErrorEvent('error', {
                            message: "[alpha-video-player-js]: play failed, error: ".concat(error_1),
                            error: error_1,
                        });
                        (_b = (_a = this.config).onError) === null || _b === void 0 ? void 0 : _b.call(_a, errorEvent);
                        throw errorEvent;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 暂停播放
     */
    Video.prototype.pause = function () {
        videoExists(this.video);
        this.video.pause();
        this.cancelDrawFrame();
    };
    /**
     * 重置播放
     */
    Video.prototype.reset = function () {
        this.setCurrentTime(0);
    };
    /**
     * 设置播放地址
     * @param playbackRate 倍速
     */
    Video.prototype.setSrc = function (src) {
        videoExists(this.video);
        this.canPlay = false;
        this.onCanPlayTimes = 1;
        this.video.src = src;
        this.video.load();
        this.video.currentTime = 0;
    };
    /**
     * 设置播放进度
     */
    Video.prototype.setCurrentTime = function (time) {
        videoExists(this.video);
        this.video.currentTime = time;
    };
    /**
     * 设置是否静音播放
     * @param muted 是否静音
     */
    Video.prototype.setMute = function (muted) {
        videoExists(this.video);
        this.video.muted = muted;
        if (muted) {
            this.video.setAttribute('muted', '');
        }
        else {
            this.video.removeAttribute('muted');
        }
    };
    /**
     * 设置是否循环播放
     * @param loop 是否循环
     */
    Video.prototype.setLoop = function (loop) {
        videoExists(this.video);
        this.video.loop = loop;
    };
    /**
     * 设置播放倍速
     * @param playbackRate 倍速
     */
    Video.prototype.setPlaybackRate = function (playbackRate) {
        videoExists(this.video);
        this.video.playbackRate = playbackRate;
    };
    /**
     * 计算最终的 canvas 逻辑尺寸。
     * 优先使用用户指定的 width/height；只传一个时根据视频比例自适应；都没传则用 container 尺寸。
     */
    Video.prototype.resolveCanvasSize = function () {
        var _a = this, config = _a.config, container = _a.container, videoWidth = _a.videoWidth, videoHeight = _a.videoHeight;
        var hasUserWidth = config.width != null && config.width > 0;
        var hasUserHeight = config.height != null && config.height > 0;
        if (hasUserWidth && hasUserHeight) {
            return { width: config.width, height: config.height };
        }
        if ((hasUserWidth || hasUserHeight) && videoWidth > 0 && videoHeight > 0) {
            var ratio = computeDisplayRatio(videoWidth, videoHeight, config.orientation);
            if (hasUserWidth) {
                return { width: config.width, height: Math.round(config.width / ratio) };
            }
            return { width: Math.round(config.height * ratio), height: config.height };
        }
        return {
            width: hasUserWidth ? config.width : container.offsetWidth,
            height: hasUserHeight ? config.height : container.offsetHeight,
        };
    };
    /**
     * 视频元数据加载完毕触发。
     * - canvas 未创建（只传一个维度的首次）→ 创建 canvas + onCanvasReady
     * - canvas 已创建 + 自适应模式 + 视频比例变化 → resize + onCanvasResized
     * - 其他 → 无需操作
     */
    Video.prototype.onLoad = function () {
        var _a = this, video = _a.video, config = _a.config;
        this.videoWidth = video.videoWidth;
        this.videoHeight = video.videoHeight;
        if (!this.canvas) {
            this.createCanvas();
            this.onCanvasReady();
        }
        else if (this.isAdaptiveMode()) {
            var _b = this.resolveCanvasSize(), width = _b.width, height = _b.height;
            var dpr = getDpr();
            var newW = width * dpr;
            var newH = height * dpr;
            if (newW !== this.canvasWidth || newH !== this.canvasHeight) {
                resizeCanvas(this.canvas, width, height);
                this.canvasWidth = this.canvas.width;
                this.canvasHeight = this.canvas.height;
                this.onCanvasResized();
            }
        }
        config.onLoad && config.onLoad();
    };
    /**
     * canvas 首次创建完成后调用，子类在此初始化渲染器（WebGL / Canvas2D）。
     */
    Video.prototype.onCanvasReady = function () { };
    /**
     * canvas resize 后调用（仅自适应模式下视频比例变化时），
     * 子类在此更新依赖尺寸的资源（gl.viewport / tempCanvas 等）。
     */
    Video.prototype.onCanvasResized = function () { };
    /**
     * 视频能够播放触发
     */
    Video.prototype.onCanplay = function () {
        var config = this.config;
        this.canPlay = true;
        config.autoShow && this.drawFrameOnce();
        // video canplay 回调会循环触发，此处保证用户 onCanPlay 回调仅首次执行
        if (this.onCanPlayTimes === 1 && config.onCanPlay) {
            config.onCanPlay();
        }
        if (this.onCanPlayTimes !== 1 && config.loop && config.onLoop) {
            config.onLoop();
        }
        this.onCanPlayTimes++;
    };
    /**
     * 视频播放触发
     */
    Video.prototype.onPlay = function () {
        var config = this.config;
        config.onPlay && config.onPlay();
    };
    /**
     * 视频暂停触发
     */
    Video.prototype.onPause = function () {
        var config = this.config;
        config.onPause && config.onPause();
    };
    /**
     * 视频播放结束触发
     */
    Video.prototype.onEnded = function () {
        var _a = this, config = _a.config, video = _a.video;
        video.currentTime = 0;
        this.cancelDrawFrame();
        config.onEnded && config.onEnded();
    };
    /**
     * 视频播放出错触发
     */
    Video.prototype.onError = function (e) {
        var _a;
        var _b = this, config = _b.config, video = _b.video;
        if (config.debug && (video === null || video === void 0 ? void 0 : video.error)) {
            var mediaError = video.error;
            console.error("[alpha-video-player-js] MediaError code: ".concat(mediaError.code, ", message: ").concat(mediaError.message || 'N/A', "."), mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                ? 'If the video is cross-origin, ensure the server returns "Access-Control-Allow-Origin" header.'
                : '');
        }
        (_a = config.onError) === null || _a === void 0 ? void 0 : _a.call(config, e);
        this.destroy();
    };
    /**
     * 销毁视频
     */
    Video.prototype.destroy = function () {
        var _a, _b, _c;
        try {
            var config = this.config;
            this.cancelDrawFrame();
            this.removeEvent();
            if (this.video) {
                this.video.pause();
                this.video.src = '';
                this.video.load();
                (_a = this.video.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this.video);
            }
            (_b = config === null || config === void 0 ? void 0 : config.onDestroy) === null || _b === void 0 ? void 0 : _b.call(config);
            this.config = null;
            this.container = null;
            this.video = null;
            this.animationId = null;
        }
        catch (e) {
            if ((_c = this.config) === null || _c === void 0 ? void 0 : _c.debug) {
                console.error('[alpha-video-player-js] destroy error:', e);
            }
        }
    };
    /**
     * 绑定实例
     */
    Video.prototype.bindInstance = function () {
        var _a = this, onLoad = _a.onLoad, onCanplay = _a.onCanplay, onPlay = _a.onPlay, onPause = _a.onPause, onEnded = _a.onEnded, onError = _a.onError;
        this.onLoad = onLoad.bind(this);
        this.onCanplay = onCanplay.bind(this);
        this.onPlay = onPlay.bind(this);
        this.onPause = onPause.bind(this);
        this.onEnded = onEnded.bind(this);
        this.onError = onError.bind(this);
    };
    /**
     * 监听 video 事件
     */
    Video.prototype.addEvent = function () {
        var _a = this, video = _a.video, onLoad = _a.onLoad, onCanplay = _a.onCanplay, onPlay = _a.onPlay, onPause = _a.onPause, onEnded = _a.onEnded, onError = _a.onError;
        video.addEventListener('loadedmetadata', onLoad);
        video.addEventListener('canplaythrough', onCanplay);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onError);
    };
    /**
     * 取消监听 video 事件
     */
    Video.prototype.removeEvent = function () {
        var _a = this, video = _a.video, onLoad = _a.onLoad, onCanplay = _a.onCanplay, onPlay = _a.onPlay, onPause = _a.onPause, onEnded = _a.onEnded, onError = _a.onError;
        video.removeEventListener('loadedmetadata', onLoad);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('canplaythrough', onCanplay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', onError);
    };
    return Video;
}());

var WebGLRender = /** @class */ (function (_super) {
    __extends(WebGLRender, _super);
    function WebGLRender(config) {
        var _this = this;
        var _a, _b;
        var onInitError = config.onInitError;
        try {
            _this = _super.call(this, config) || this;
            if (_this.canvas) {
                _this.initWebGLRender();
                (_b = (_a = _this.config).onInitSuccess) === null || _b === void 0 ? void 0 : _b.call(_a);
            }
        }
        catch (e) {
            onInitError && onInitError(e);
        }
        return _this;
    }
    WebGLRender.prototype.onCanvasReady = function () {
        var _a, _b, _c, _d;
        try {
            this.initWebGLRender();
            (_b = (_a = this.config).onInitSuccess) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        catch (e) {
            (_d = (_c = this.config).onInitError) === null || _d === void 0 ? void 0 : _d.call(_c, e);
        }
    };
    WebGLRender.prototype.onCanvasResized = function () {
        var _a = this, gl = _a.gl, canvas = _a.canvas;
        if (gl && canvas) {
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    };
    /**
     * 初始化 webgl 渲染器
     */
    WebGLRender.prototype.initWebGLRender = function () {
        var canvas = this.canvas;
        var gl = this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.vertexShader = this.initShader(gl.VERTEX_SHADER, VSHADER_SOURCE);
        this.fragmentShader = this.initShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE);
        this.program = this.initProgram();
        this.texture = this.initTexture();
        this.vertexBuffer = this.initVertexBuffer();
    };
    /**
     * 初始化着色器
     * @param type 着色器类型
     * @param source 着色器代码
     * @returns 着色器对象
     */
    WebGLRender.prototype.initShader = function (type, source) {
        var gl = this.gl;
        // 创建着色器对象
        var shader = gl.createShader(type);
        // 指定着色器对象代码
        gl.shaderSource(shader, source);
        // 编译着色器
        gl.compileShader(shader);
        // 检查着色器编译结果（耗费性能，仅在调试阶段启用）
        if (this.config.debug) {
            var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            console.log('[alpha-video-player-js] shader compile result: ', type, compiled);
            if (!compiled) {
                console.log('[alpha-video-player-js] shader compile fail: ', type, gl.getShaderInfoLog(shader));
            }
        }
        return shader;
    };
    /**
     * 初始化程序对象
     * @returns 程序对象
     */
    WebGLRender.prototype.initProgram = function () {
        var gl = this.gl;
        // 创建程序对象
        var program = gl.createProgram();
        // 为程序对象分配着色器
        gl.attachShader(program, this.vertexShader);
        gl.attachShader(program, this.fragmentShader);
        // 连接程序对象
        gl.linkProgram(program);
        // 检查程序对象与着色器连接结果（耗费性能，仅在调试阶段启用）
        if (this.config.debug) {
            var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
            console.log('[alpha-video-player-js] program connect shader result: ', linked);
            if (!linked) {
                console.log('[alpha-video-player-js] program connect shader fail: ', gl.getProgramInfoLog(program));
            }
        }
        // 告知 WebGL 系统所使用的程序对象
        gl.useProgram(program);
        return program;
    };
    /**
     * 初始化纹理
     */
    WebGLRender.prototype.initTexture = function () {
        var gl = this.gl;
        // 创建纹理对象
        var texture = gl.createTexture();
        // 对纹理图像进行 Y 轴反转
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        // 激活 0 号纹理单元
        gl.activeTexture(gl.TEXTURE0);
        // 绑定纹理对象
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // 配置纹理参数
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
    };
    /**
     * 设置顶点着色器与片元着色器信息
     */
    WebGLRender.prototype.initVertexBuffer = function () {
        var _a = this, gl = _a.gl, program = _a.program, config = _a.config;
        var orientation = config.orientation, side = config.side;
        var coords = computeVertexCoord(orientation, side);
        // 创建缓冲区对象
        var vertexBuffer = gl.createBuffer();
        // 将顶点坐标和纹理坐标写入缓冲区对象
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
        var FSIZE = coords.BYTES_PER_ELEMENT;
        // 分配坐标并开启
        var a_Position = gl.getAttribLocation(program, 'a_Position');
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 6, 0);
        gl.enableVertexAttribArray(a_Position);
        var a_Video_Texture_Position = gl.getAttribLocation(program, 'a_Video_Texture_Position');
        gl.vertexAttribPointer(a_Video_Texture_Position, 2, gl.FLOAT, false, FSIZE * 6, FSIZE * 2);
        gl.enableVertexAttribArray(a_Video_Texture_Position);
        var a_Alpha_Video_Texture_Position = gl.getAttribLocation(program, 'a_Alpha_Video_Texture_Position');
        gl.vertexAttribPointer(a_Alpha_Video_Texture_Position, 2, gl.FLOAT, false, FSIZE * 6, FSIZE * 4);
        gl.enableVertexAttribArray(a_Alpha_Video_Texture_Position);
        // 将纹理单元传递给片元着色器
        var u_Sampler = gl.getUniformLocation(program, 'u_Sampler');
        gl.uniform1i(u_Sampler, 0);
        return vertexBuffer;
    };
    /**
     * 绘制一帧
     */
    WebGLRender.prototype.drawFrameOnce = function () {
        var _a = this, gl = _a.gl, video = _a.video;
        if (!gl || !video || !this.canPlay)
            return;
        // 清除颜色缓冲区
        gl.clear(gl.COLOR_BUFFER_BIT);
        // 为纹理对象分配纹理图像
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        // 绘制
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    /**
     * 逐帧绘制当前视频内容
     */
    WebGLRender.prototype.drawFrame = function () {
        this.drawFrameOnce();
        // 重复
        _super.prototype.drawFrame.call(this);
    };
    /**
     * 播放结束触发
     */
    WebGLRender.prototype.onEnded = function () {
        var _a = this, gl = _a.gl, config = _a.config;
        // 清除颜色缓冲区
        config.autoClear && gl.clear(gl.COLOR_BUFFER_BIT);
        _super.prototype.onEnded.call(this);
        config.autoDestroy && this.destroy();
    };
    /**
     * 销毁
     */
    WebGLRender.prototype.destroy = function () {
        var _a, _b;
        var _c = this, canvas = _c.canvas, gl = _c.gl, vertexShader = _c.vertexShader, fragmentShader = _c.fragmentShader, texture = _c.texture, vertexBuffer = _c.vertexBuffer, program = _c.program;
        if (!canvas || !gl)
            return;
        _super.prototype.destroy.call(this);
        (_a = canvas.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(canvas);
        // 分离着色器对象
        gl.detachShader(program, vertexShader);
        // 删除着色器对象
        gl.deleteShader(vertexShader);
        gl.detachShader(program, fragmentShader);
        gl.deleteShader(fragmentShader);
        // 删除纹理对象
        gl.deleteTexture(texture);
        // 删除缓冲区对象
        gl.deleteBuffer(vertexBuffer);
        // 删除程序对象
        gl.deleteProgram(program);
        // 释放内存
        (_b = gl.getExtension('WEBGL_lose_context')) === null || _b === void 0 ? void 0 : _b.loseContext();
        this.canvas = null;
        this.gl = null;
        this.vertexShader = null;
        this.fragmentShader = null;
        this.texture = null;
        this.vertexBuffer = null;
        this.program = null;
    };
    return WebGLRender;
}(Video));

var CanvasRender = /** @class */ (function (_super) {
    __extends(CanvasRender, _super);
    function CanvasRender(config) {
        var _this = this;
        var _a, _b;
        var onInitError = config.onInitError;
        try {
            _this = _super.call(this, config) || this;
            if (_this.canvas) {
                _this.initCanvasRender();
                (_b = (_a = _this.config).onInitSuccess) === null || _b === void 0 ? void 0 : _b.call(_a);
            }
        }
        catch (e) {
            onInitError && onInitError(e);
        }
        return _this;
    }
    CanvasRender.prototype.onCanvasReady = function () {
        var _a, _b, _c, _d;
        try {
            this.initCanvasRender();
            (_b = (_a = this.config).onInitSuccess) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        catch (e) {
            (_d = (_c = this.config).onInitError) === null || _d === void 0 ? void 0 : _d.call(_c, e);
        }
    };
    CanvasRender.prototype.onCanvasResized = function () {
        var _a = this, canvasWidth = _a.canvasWidth, canvasHeight = _a.canvasHeight, config = _a.config, tempCanvas = _a.tempCanvas;
        var orientation = config.orientation, side = config.side;
        if (!tempCanvas || !canvasWidth || !canvasHeight)
            return;
        this.tempCanvasWidth = tempCanvas.width = computeSize(orientation, 'width', canvasWidth);
        this.tempCanvasHeight = tempCanvas.height = computeSize(orientation, 'height', canvasHeight);
        var _b = computeImageCoord(orientation, side, canvasWidth, canvasHeight), imageCoords = _b.imageCoords, alhpaImageCoords = _b.alhpaImageCoords;
        this.imageCoords = imageCoords;
        this.alhpaImageCoords = alhpaImageCoords;
    };
    /**
     * 初始化 canvas 渲染器
     */
    CanvasRender.prototype.initCanvasRender = function () {
        var _a = this, canvas = _a.canvas, canvasWidth = _a.canvasWidth, canvasHeight = _a.canvasHeight, config = _a.config;
        var orientation = config.orientation, side = config.side;
        var tempCanvas = this.tempCanvas = document.createElement('canvas');
        this.tempCanvasWidth = tempCanvas.width = computeSize(orientation, 'width', canvasWidth);
        this.tempCanvasHeight = tempCanvas.height = computeSize(orientation, 'height', canvasHeight);
        // 计算画布图片渲染位置
        var _b = computeImageCoord(orientation, side, canvasWidth, canvasHeight), imageCoords = _b.imageCoords, alhpaImageCoords = _b.alhpaImageCoords;
        this.imageCoords = imageCoords;
        this.alhpaImageCoords = alhpaImageCoords;
        this.context2d = canvas.getContext('2d');
        this.tempContext2d = tempCanvas.getContext('2d');
    };
    /**
     * 绘制一帧
     */
    CanvasRender.prototype.drawFrameOnce = function () {
        var _a = this, context2d = _a.context2d, tempContext2d = _a.tempContext2d, video = _a.video, canPlay = _a.canPlay, videoWidth = _a.videoWidth, videoHeight = _a.videoHeight, tempCanvasWidth = _a.tempCanvasWidth, tempCanvasHeight = _a.tempCanvasHeight, imageCoords = _a.imageCoords, alhpaImageCoords = _a.alhpaImageCoords;
        if (!context2d || !tempContext2d || !video || !canPlay || !videoWidth || !videoHeight || !tempCanvasWidth || !tempCanvasHeight || !imageCoords || !alhpaImageCoords)
            return;
        // 获取当前帧视频并进行缩放
        tempContext2d.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, tempCanvasWidth, tempCanvasHeight);
        // 获取 RGB 通道视频图片数据
        var image = tempContext2d.getImageData.apply(tempContext2d, imageCoords);
        var imageData = image.data;
        // 获取 alpha 视频图片数据
        var alphaData = tempContext2d.getImageData.apply(tempContext2d, alhpaImageCoords).data;
        // 替换 alpha 通道（取 R 通道，与 WebGL shader 一致）
        for (var i = 3; i < imageData.length; i += 4) {
            imageData[i] = alphaData[i - 3];
        }
        // 将处理后的图片数据放回画布
        context2d.putImageData(image, 0, 0);
    };
    /**
     * 逐帧绘制当前视频内容
     */
    CanvasRender.prototype.drawFrame = function () {
        this.drawFrameOnce();
        _super.prototype.drawFrame.call(this);
    };
    /**
     * 播放结束触发
     */
    CanvasRender.prototype.onEnded = function () {
        var _a = this, context2d = _a.context2d, canvasWidth = _a.canvasWidth, canvasHeight = _a.canvasHeight, config = _a.config;
        // 清除画布
        config.autoClear && context2d.clearRect(0, 0, canvasWidth, canvasHeight);
        _super.prototype.onEnded.call(this);
        config.autoDestroy && this.destroy();
    };
    /**
     * 销毁
     */
    CanvasRender.prototype.destroy = function () {
        var _a;
        var canvas = this.canvas;
        if (!canvas)
            return;
        _super.prototype.destroy.call(this);
        (_a = canvas.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(canvas);
        // 释放内存
        this.canvas = null;
        this.context2d = null;
        this.tempCanvas = null;
        this.tempContext2d = null;
        this.tempCanvasWidth = null;
        this.tempCanvasHeight = null;
        this.imageCoords = null;
        this.alhpaImageCoords = null;
    };
    return CanvasRender;
}(Video));

var Render = /** @class */ (function () {
    function Render(config) {
        if (supportWebGL()) {
            this.render = new WebGLRender(config);
        }
        else if (supportCanvas2d()) {
            this.render = new CanvasRender(config);
        }
        else {
            throw new Error('[alpha-video-player-js]: Your browser does not support play. Please upgrade your browser and try again.');
        }
    }
    Object.defineProperty(Render.prototype, "playing", {
        get: function () {
            return this.render.playing;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Render.prototype, "loop", {
        get: function () {
            return this.render.loop;
        },
        enumerable: false,
        configurable: true
    });
    Render.prototype.play = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.render.play(config)];
            });
        });
    };
    Render.prototype.pause = function () {
        this.render.pause();
    };
    Render.prototype.destroy = function () {
        this.render.destroy();
    };
    Render.prototype.reset = function () {
        this.render.reset();
    };
    Render.prototype.setSrc = function (src) {
        this.render.setSrc(src);
    };
    Render.prototype.setCurrentTime = function (time) {
        this.render.setCurrentTime(time);
    };
    Render.prototype.setMute = function (muted) {
        this.render.setMute(muted);
    };
    Render.prototype.setLoop = function (loop) {
        this.render.setLoop(loop);
    };
    Render.prototype.setPlaybackRate = function (playbackRate) {
        this.render.setPlaybackRate(playbackRate);
    };
    return Render;
}());

export { Render as default };
