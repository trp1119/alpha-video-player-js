import { DEFAULT_ALPHA_ALIGN, DEFAULT_ALPHA_SCALE, DEFAULT_CONFIG, VIDEO_READY_STATE_CURRENT_DATA } from './constants'
import { playerDestroyedError, videoSourceMissingError } from './error'
import type { IAlphaAlign, IConfig, IOptionalConfig, IOrientation, ISide } from './type'

interface ILayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 设备像素比（惰性取值，SSR 安全）
 */
export const getDpr = () => typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1

/**
 * 创建画布
 * @param container 容器
 * @returns 画布
 */
export const initCanvas = (container: HTMLElement, width?: number, height?: number) => {
  const { offsetWidth, offsetHeight } = container
  const dpr = getDpr()

  const resolvedWidth = width || offsetWidth
  const resolvedHeight = height || offsetHeight

  if (!resolvedWidth || !resolvedHeight) {
    console.warn(
      '[alpha-video-player-js]: container size is 0. ' +
      'Make sure the container is mounted and has a non-zero size before creating the player.'
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = resolvedWidth * dpr
  canvas.height = resolvedHeight * dpr
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'

  container.appendChild(canvas)

  return canvas
}

/**
 * 校验并返回 Alpha 相对 RGB 的宽高缩放比例。
 */
export const resolveAlphaScale = (alphaScale = DEFAULT_ALPHA_SCALE) => {
  if (typeof alphaScale !== 'number' || !isFinite(alphaScale) || alphaScale < 0 || alphaScale > 1) {
    throw new Error('[alpha-video-player-js]: alphaScale must be a finite number between 0 and 1.')
  }
  return alphaScale
}

export const resolvePlayerConfig = (config: IConfig | IOptionalConfig, current?: IConfig | null) => {
  const resolved = Object.assign({}, DEFAULT_CONFIG, current || {}, config) as IConfig
  resolved.playbackRate = resolved.playbackRate ?? DEFAULT_CONFIG.playbackRate
  resolved.muted = resolved.muted ?? DEFAULT_CONFIG.muted
  resolved.loop = resolved.loop ?? DEFAULT_CONFIG.loop
  resolved.fps = resolved.fps ?? DEFAULT_CONFIG.fps
  resolved.orientation = resolved.orientation ?? DEFAULT_CONFIG.orientation
  resolved.side = resolved.side ?? DEFAULT_CONFIG.side
  resolved.alphaScale = resolveAlphaScale(resolved.alphaScale)
  resolved.alphaAlign = resolved.alphaAlign ?? DEFAULT_ALPHA_ALIGN
  resolved.autoShow = resolved.autoShow ?? DEFAULT_CONFIG.autoShow
  resolved.autoClear = resolved.autoClear ?? DEFAULT_CONFIG.autoClear
  resolved.autoDestroy = resolved.autoDestroy ?? DEFAULT_CONFIG.autoDestroy
  resolved.autoResize = resolved.autoResize ?? DEFAULT_CONFIG.autoResize
  resolved.debug = resolved.debug ?? DEFAULT_CONFIG.debug
  resolved.videoFrame = resolved.videoFrame ?? DEFAULT_CONFIG.videoFrame
  return resolved
}

/**
 * 计算视频帧中 RGB 与 Alpha 的归一化区域，坐标原点位于左上角。
 */
export const computeLayoutRects = (
  orientation: IOrientation,
  side: ISide,
  alphaScale = DEFAULT_ALPHA_SCALE,
  alphaAlign: IAlphaAlign = DEFAULT_ALPHA_ALIGN,
) => {
  const scale = resolveAlphaScale(alphaScale)

  if (orientation === 'landscape') {
    const rgbWidth = 1 / (1 + scale)
    const alphaWidth = scale / (1 + scale)
    const alphaHeight = scale
    const alphaY = alphaAlign === 'start' ? 0 : 1 - alphaHeight

    return {
      rgb: {
        x: side === 'front' ? 0 : alphaWidth,
        y: 0,
        width: rgbWidth,
        height: 1,
      },
      alpha: {
        x: side === 'front' ? rgbWidth : 0,
        y: alphaY,
        width: alphaWidth,
        height: alphaHeight,
      },
    }
  }

  const rgbHeight = 1 / (1 + scale)
  const alphaHeight = scale / (1 + scale)
  const alphaWidth = scale
  const alphaX = alphaAlign === 'start' ? 0 : 1 - alphaWidth

  return {
    rgb: {
      x: 0,
      y: side === 'front' ? 0 : alphaHeight,
      width: 1,
      height: rgbHeight,
    },
    alpha: {
      x: alphaX,
      y: side === 'front' ? rgbHeight : 0,
      width: alphaWidth,
      height: alphaHeight,
    },
  }
}

/**
 * 根据视频原始尺寸和布局计算 RGB 内容的显示宽高比。
 */
export const computeDisplayRatio = (
  videoWidth: number,
  videoHeight: number,
  orientation: IOrientation,
  alphaScale = DEFAULT_ALPHA_SCALE,
  alphaAlign: IAlphaAlign = DEFAULT_ALPHA_ALIGN,
) => {
  if (alphaScale === 0) return videoWidth / videoHeight
  const { rgb } = computeLayoutRects(orientation, 'front', alphaScale, alphaAlign)
  return (videoWidth * rgb.width) / (videoHeight * rgb.height)
}

/**
 * 重新设置 canvas 的像素尺寸（不改变 CSS 尺寸和 DOM 结构）
 */
export const resizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
  const dpr = getDpr()
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
}

const computeTextureCoords = ({ x, y, width, height }: ILayoutRect) => [
  x, 1 - y,
  x + width, 1 - y,
  x, 1 - y - height,
  x + width, 1 - y - height,
]

/**
 * 计算渲染坐标
 * @param orientation 视频排布方式
 * @param side RGB 通道视频位置
 * @param alphaScale Alpha 相对 RGB 的宽高缩放比例
 * @param alphaAlign Alpha 在副轴上的对齐方式
 */
export const computeVertexCoord = (
  orientation: IOrientation,
  side: ISide,
  alphaScale = DEFAULT_ALPHA_SCALE,
  alphaAlign: IAlphaAlign = DEFAULT_ALPHA_ALIGN,
) => {
  const vertexCoords = [
    -1, 1,
    1, 1, 
    -1, -1,
    1, -1
  ]

  const { rgb, alpha } = computeLayoutRects(orientation, side, alphaScale, alphaAlign)
  const textureCoords = computeTextureCoords(rgb)
  const alphaTextureCoords = computeTextureCoords(alpha)

  let combineCoords: number[] = []
  vertexCoords.forEach((i, index) => {
    if (index % 2 === 0) {
      combineCoords = combineCoords
        .concat(vertexCoords.slice(index, index + 2))
        .concat(textureCoords.slice(index, index + 2))
        .concat(alphaTextureCoords.slice(index, index + 2))
    }
  })

  return new Float32Array(combineCoords)
}

/**
 * 判断视频是否存在
 * @param video 视频
 */
export const videoExists = (video: HTMLVideoElement, action: string, destroyed = false) => {
  if (destroyed) throw playerDestroyedError(action)
  if (!video) {
    throw videoSourceMissingError(action)
  }
}

/**
 * WebGL / Canvas 只能在真实媒体帧就绪后读取 video，避免误读 Android WebView 默认 poster。
 */
export const videoFrameReady = (video: HTMLVideoElement) => (
  video.readyState >= VIDEO_READY_STATE_CURRENT_DATA &&
  video.videoWidth > 0 &&
  video.videoHeight > 0
)

/**
 * requestAnimationFrame（惰性取值，SSR 安全）
 */
export const getRequestAnimationFrame = (): ((callback: FrameRequestCallback) => number) | null => {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.requestAnimationFrame ||
    w.webkitRequestAnimationFrame ||
    w.mozRequestAnimationFrame ||
    w.oRequestAnimationFrame ||
    w.msRequestAnimationFrame ||
    null
}

/**
 * cancelAnimationFrame（惰性取值，SSR 安全）
 */
export const getCancelAnimationFrame = (): ((handle: number) => void) | null => {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.cancelAnimationFrame ||
    w.mozCancelAnimationFrame ||
    w.webkitCancelAnimationFrame ||
    w.msCancelAnimationFrame ||
    null
}
