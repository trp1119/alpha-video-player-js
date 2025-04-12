interface IConfig {
    container: HTMLElement;
    width?: number;
    height?: number;
    src: string;
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
    onInitSuccess?: () => void;
    onInitError?: (e: ErrorEvent) => void;
    onLoad?: () => void;
    onCanPlay?: () => void;
    onPlay?: () => void;
    onLoop?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (e: ErrorEvent) => void;
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
    play(config?: IOptionalConfig): void;
    pause(): void;
    destroy(): void;
    reset(): void;
    setSrc(src: string): void;
    setCurrentTime(time: number): void;
    setMute(muted: boolean): void;
    setLoop(loop: boolean): void;
    setPlaybackRate(playbackRate: number): void;
}

export { type IConfig, Render as default };
