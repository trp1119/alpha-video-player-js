import React from 'react';

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
/** 核心类实例类型（`new Render(...)` 的实例），便于业务侧标注 ref / getPlayer() 等 */
type IAlphaVideoPlayer = InstanceType<typeof Render>;

/**
 * Vue 2 / Vue 3 的 template ref、React 的 `useRef` 所指向的命令式 API 形状（与 `expose` / `useImperativeHandle` 一致）。
 */
type IAlphaVideoPlayerRef = {
    play: () => Promise<void> | undefined;
    pause: () => void;
    destroy: () => void;
    reset: () => void;
    setSrc: (src: string) => void;
    setCurrentTime: (time: number) => void;
    setMute: (muted: boolean) => void;
    setLoop: (loop: boolean) => void;
    setPlaybackRate: (rate: number) => void;
    getPlayer: () => IAlphaVideoPlayer | null;
};

interface IAlphaVideoPlayerProps {
    src?: string;
    width?: number;
    height?: number;
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
    autoResize?: 'width' | 'height' | 'contain' | false;
    onInitSuccess?: () => void;
    onInitError?: (e: ErrorEvent) => void;
    onLoad?: () => void;
    onCanPlay?: () => void;
    onPlay?: () => void;
    onLoop?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (e: unknown) => void;
    onDestroy?: () => void;
    className?: string;
    style?: React.CSSProperties;
}
declare const AlphaVideoPlayer: React.ForwardRefExoticComponent<IAlphaVideoPlayerProps & React.RefAttributes<IAlphaVideoPlayerRef>>;

export { type IAlphaVideoPlayerProps, type IAlphaVideoPlayerRef, AlphaVideoPlayer as default };
