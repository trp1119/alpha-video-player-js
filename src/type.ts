export interface IConfig {
  container: HTMLElement
  width?: number,
  height?: number
  src?: string
  /** 跨域视频资源；默认 anonymous */
  crossOrigin?: 'anonymous' | 'use-credentials'
  muted?: boolean
  loop?: boolean
  playbackRate?: number
  fps?: number
  orientation?: IOrientation
  side?: ISide
  videoFrame?: boolean
  debug?: boolean
  autoShow?: boolean
  autoClear?: boolean
  autoDestroy?: boolean
  /**
   * 视频加载后按比例自适应 canvas 尺寸（默认 'contain'）。
   * - 'contain'：自动判断，确保视频完整填入 canvas 盒子（类似 object-fit: contain）
   * - 'width'：固定宽度，按视频比例自动调整高度
   * - 'height'：固定高度，按视频比例自动调整宽度
   * - false：不自适应，canvas 保持初始尺寸
   */
  autoResize?: 'width' | 'height' | 'contain' | false
  onInitSuccess?: () => void
  onInitError?: (e: ErrorEvent) => void
  onLoad?: () => void
  onCanPlay?: () => void
  onPlay?: () => void
  onLoop?: () => void
  onPause?: () => void
  onEnded?: () => void
  /** 媒体 error 事件或 play() 拒绝等，原样传入 */
  onError?: (e: unknown) => void
  onDestroy?: () => void
}

export type IOptionalConfig = Omit<IConfig, 'container' | 'src'> & Partial<Pick<IConfig, 'container' | 'src'>>

export type IOrientation = 'landscape' | 'portrait'

export type ISide = 'front' | 'back'

export type ICoords = {
  [key in IOrientation]: {
    [key in ISide]: number[]
  }
}

export type IImageCoords = [number, number, number, number]
