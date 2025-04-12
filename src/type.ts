export interface IConfig {
  container: HTMLElement
  width?: number,
  height?: number
  src: string
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
  onInitSuccess?: () => void
  onInitError?: (e: ErrorEvent) => void
  onLoad?: () => void
  onCanPlay?: () => void
  onPlay?: () => void
  onLoop?: () => void
  onPause?: () => void
  onEnded?: () => void
  onError?: (e: ErrorEvent) => void
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
