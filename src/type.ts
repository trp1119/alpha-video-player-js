export interface IConfig {
  container: HTMLElement
  width?: number,
  height?: number
  src?: string
  /** 视频封面；未传时使用内置透明封面规避 Android WebView 默认 poster 的 CORS 问题 */
  poster?: string
  /** 跨域视频资源；默认 anonymous */
  crossOrigin?: 'anonymous' | 'use-credentials'
  muted?: boolean
  loop?: boolean
  playbackRate?: number
  fps?: number
  orientation?: IOrientation
  side?: ISide
  /** Alpha 遮罩宽高相对 RGB 内容的缩放比例；0 表示普通不透明视频 */
  alphaScale?: number
  /** Alpha 缩小后在副轴上的对齐方式 */
  alphaAlign?: IAlphaAlign
  videoFrame?: boolean
  debug?: boolean
  autoShow?: boolean
  autoClear?: boolean
  autoDestroy?: boolean
  /**
   * 视频加载后按比例自适应渲染目标尺寸（默认 'contain'）。
   * - 'contain'：自动判断，确保视频完整填入容器盒子（类似 object-fit: contain）
   * - 'width'：固定宽度，按视频比例自动调整高度
   * - 'height'：固定高度，按视频比例自动调整宽度
   * - false：不自适应，渲染目标保持初始尺寸
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

export type IAlphaAlign = 'start' | 'end'
