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

interface AlphaVideoPlayerProps {
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
type AlphaVideoPlayerRef = AlphaVideoPlayerExpose;
declare const AlphaVideoPlayer: React.ForwardRefExoticComponent<AlphaVideoPlayerProps & React.RefAttributes<AlphaVideoPlayerExpose>>;

export { type AlphaVideoPlayerProps, type AlphaVideoPlayerRef, AlphaVideoPlayer as default };
