import * as vue from 'vue';
import { PropType } from 'vue';

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

export { _default as default };
