import type { IOrientation, ISide, ICoords, IImageCoords } from './type'

/**
 * 设备像素比（惰性取值，SSR 安全）
 */
export const getDpr = () => typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1

/**
 * 是否支持 canvas2d
 */
export const supportCanvas2d = () => {
  const canvas = document.createElement('canvas')
  return !!canvas.getContext('2d')
}

/**
 * 是否支持 webgl
 */
export const supportWebGL = () => {
  const canvas = document.createElement('canvas')
  return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
}

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
 * 根据视频原始尺寸和 orientation 计算显示区域宽高比。
 * alpha 视频中，landscape 时左右各半（实际宽 = videoWidth / 2），
 * portrait 时上下各半（实际高 = videoHeight / 2）。
 */
export const computeDisplayRatio = (videoWidth: number, videoHeight: number, orientation: IOrientation) => {
  const displayWidth = orientation === 'landscape' ? videoWidth / 2 : videoWidth
  const displayHeight = orientation === 'portrait' ? videoHeight / 2 : videoHeight
  return displayWidth / displayHeight
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

const DEFINE_COORDS: ICoords = {
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
}

/**
 * 计算渲染坐标
 * @param orientation 视频排布方式
 * @param side RGB 通道视频位置
 */
export const computeVertexCoord = (orientation: IOrientation, side: ISide) => {
  const isFront = side === 'front'
  const vertexCoords = [
    -1, 1,
    1, 1, 
    -1, -1,
    1, -1
  ]

  const textureCoords = DEFINE_COORDS[orientation][isFront ? 'front' : 'back']
  const alphaTextureCoords = DEFINE_COORDS[orientation][!isFront ? 'front' : 'back']

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

const IMAGE_COORDS_MAP: Record<string, (w: number, h: number) => IImageCoords> = {
  'landscape_front': (w, h) => [0, 0, w, h],
  'landscape_back':  (w, h) => [w, 0, w, h],
  'portrait_front':  (w, h) => [0, 0, w, h],
  'portrait_back':   (w, h) => [0, h, w, h],
}

/**
 * 计算画布图片渲染位置
 * @param orientation 视频排布位置
 * @param side 视频
 * @param width 画布宽
 * @param height 画布高
 */
export const computeImageCoord = (orientation: IOrientation, side: ISide, width: number, height: number) => {
  const otherSide: ISide = side === 'front' ? 'back' : 'front'
  const imageCoords = IMAGE_COORDS_MAP[`${orientation}_${side}`](width, height)
  const alphaImageCoords = IMAGE_COORDS_MAP[`${orientation}_${otherSide}`](width, height)

  return { imageCoords, alphaImageCoords }
}

/**
 * 计算临时画布尺寸
 * @param orientation 视频排布位置
 * @param type 尺寸类型
 * @param size 尺寸
 */
export const computeSize = (orientation: IOrientation, type: 'width' | 'height', size: number) => {
  if (orientation === 'landscape') {
    return type === 'width' ? size * 2 : size
  } else {
    return type === 'width' ? size : size * 2
  }
}

/**
 * 判断视频是否存在
 * @param video 视频
 */
export const videoExists = (video: HTMLVideoElement) => {
  if (!video) {
    throw new Error('[alpha-video-player-js]: setting failed, please instantiate first!')
  }
}

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
