import * as vue from 'vue';
import { PropType } from 'vue';

interface IConfig {
    container: HTMLElement;
    width?: number;
    height?: number;
    src?: string;
    /** 跨域视频资源；默认 anonymous */
    crossOrigin?: 'anonymous' | 'use-credentials';
    muted?: boolean;
    loop?: boolean;
    playbackRate?: number;
    fps?: number;
    orientation?: IOrientation;
    side?: ISide;
    videoFrame?: boolean;
    debug?: boolean;
    autoShow?: boolean;
    autoClear?: boolean;
    autoDestroy?: boolean;
    /**
     * 视频加载后按比例自适应 canvas 尺寸（默认 'contain'）。
     * - 'contain'：自动判断，确保视频完整填入 canvas 盒子（类似 object-fit: contain）
     * - 'width'：固定宽度，按视频比例自动调整高度
     * - 'height'：固定高度，按视频比例自动调整宽度
     * - false：不自适应，canvas 保持初始尺寸
     */
    autoResize?: 'width' | 'height' | 'contain' | false;
    onInitSuccess?: () => void;
    onInitError?: (e: ErrorEvent) => void;
    onLoad?: () => void;
    onCanPlay?: () => void;
    onPlay?: () => void;
    onLoop?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    /** 媒体 error 事件或 play() 拒绝等，原样传入 */
    onError?: (e: unknown) => void;
    onDestroy?: () => void;
}
type IOptionalConfig = Omit<IConfig, 'container' | 'src'> & Partial<Pick<IConfig, 'container' | 'src'>>;
type IOrientation = 'landscape' | 'portrait';
type ISide = 'front' | 'back';

declare const _default: vue.DefineComponent<vue.ExtractPropTypes<{
    src: {
        type: StringConstructor;
        default: any;
    };
    width: {
        type: NumberConstructor;
        default: any;
    };
    height: {
        type: NumberConstructor;
        default: any;
    };
    crossOrigin: {
        type: PropType<"anonymous" | "use-credentials">;
        default: any;
    };
    muted: {
        type: BooleanConstructor;
        default: boolean;
    };
    loop: {
        type: BooleanConstructor;
        default: boolean;
    };
    playbackRate: {
        type: NumberConstructor;
        default: number;
    };
    fps: {
        type: NumberConstructor;
        default: number;
    };
    orientation: {
        type: PropType<IOrientation>;
        default: string;
    };
    side: {
        type: PropType<ISide>;
        default: string;
    };
    videoFrame: {
        type: BooleanConstructor;
        default: boolean;
    };
    debug: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoShow: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoClear: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoDestroy: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoResize: {
        type: PropType<false | "width" | "height" | "contain">;
        default: string;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, ("loop" | "ended" | "error" | "load" | "pause" | "play" | "canPlay" | "initSuccess" | "initError" | "destroy")[], "loop" | "ended" | "error" | "load" | "pause" | "play" | "canPlay" | "initSuccess" | "initError" | "destroy", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    src: {
        type: StringConstructor;
        default: any;
    };
    width: {
        type: NumberConstructor;
        default: any;
    };
    height: {
        type: NumberConstructor;
        default: any;
    };
    crossOrigin: {
        type: PropType<"anonymous" | "use-credentials">;
        default: any;
    };
    muted: {
        type: BooleanConstructor;
        default: boolean;
    };
    loop: {
        type: BooleanConstructor;
        default: boolean;
    };
    playbackRate: {
        type: NumberConstructor;
        default: number;
    };
    fps: {
        type: NumberConstructor;
        default: number;
    };
    orientation: {
        type: PropType<IOrientation>;
        default: string;
    };
    side: {
        type: PropType<ISide>;
        default: string;
    };
    videoFrame: {
        type: BooleanConstructor;
        default: boolean;
    };
    debug: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoShow: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoClear: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoDestroy: {
        type: BooleanConstructor;
        default: boolean;
    };
    autoResize: {
        type: PropType<false | "width" | "height" | "contain">;
        default: string;
    };
}>> & Readonly<{
    onInitSuccess?: (...args: any[]) => any;
    onInitError?: (...args: any[]) => any;
    onLoad?: (...args: any[]) => any;
    onCanPlay?: (...args: any[]) => any;
    onPlay?: (...args: any[]) => any;
    onLoop?: (...args: any[]) => any;
    onPause?: (...args: any[]) => any;
    onEnded?: (...args: any[]) => any;
    onError?: (...args: any[]) => any;
    onDestroy?: (...args: any[]) => any;
}>, {
    width: number;
    height: number;
    src: string;
    crossOrigin: "anonymous" | "use-credentials";
    muted: boolean;
    loop: boolean;
    playbackRate: number;
    fps: number;
    orientation: IOrientation;
    side: ISide;
    videoFrame: boolean;
    debug: boolean;
    autoShow: boolean;
    autoClear: boolean;
    autoDestroy: boolean;
    autoResize: false | "width" | "height" | "contain";
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

declare class Render {
    private render;
    constructor(config: IConfig);
    get playing(): boolean;
    get loop(): boolean;
    play(config?: IOptionalConfig): Promise<void>;
    pause(): void;
    destroy(): void;
    reset(): void;
    setSrc(src: string): void;
    setCurrentTime(time: number): void;
    setMute(muted: boolean): void;
    setLoop(loop: boolean): void;
    setPlaybackRate(playbackRate: number): void;
}

/**
 * Vue 2 / Vue 3 组件通过 ref（或 Vue 3 的 expose）可调用的方法与内核实例。
 * 与 `alpha-video-player-js/react` 导出的 `AlphaVideoPlayerRef` 字段一致。
 */
type AlphaVideoPlayerExpose = {
    play: () => Promise<void> | undefined;
    pause: () => void;
    destroy: () => void;
    reset: () => void;
    setSrc: (src: string) => void;
    setCurrentTime: (time: number) => void;
    setMute: (muted: boolean) => void;
    setLoop: (loop: boolean) => void;
    setPlaybackRate: (rate: number) => void;
    getPlayer: () => Render | null;
};

export { type AlphaVideoPlayerExpose, _default as default };
