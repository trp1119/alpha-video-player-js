import type { IOrientation, ISide, ICoords, IImageCoords } from './type'

/**
 * 设备像素比
 */
export const dpr = window.devicePixelRatio
/**
 * 是否支持 canvas2d
 * @returns 
 */
export const supportCanvas2d = () => {
  const canvas = document.createElement('canvas')
  return !!canvas.getContext('2d')
}
/**
 * 是否支持 webgl
 * @returns 
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

  const canvas = document.createElement('canvas')
  canvas.width = (width || offsetWidth) * dpr
  canvas.height = (height || offsetHeight) * dpr
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'

  container.appendChild(canvas)

  return canvas
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
 * @returns 
 */
export const computeVertexCoord = (orientation: IOrientation, side: ISide) => {
  const isFront = side === 'front'
  // 顶点坐标
  const vertexCoords = [
    -1, 1,
    1, 1, 
    -1, -1,
    1, -1
  ]

  // 纹理坐标
  const textureCoords = DEFINE_COORDS[orientation][isFront ? 'front' : 'back']
  // 透明度坐标
  const alphaTextureCoords = DEFINE_COORDS[orientation][!isFront ? 'front' : 'back']

  // 顶点坐标 纹理坐标 透明度坐标
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
 * 计算画布图片渲染位置
 * @param orientation 视频排布位置
 * @param side 视频
 * @param width 画布宽
 * @param height 画布高
 * @returns 
 */
export const computeImageCoord = (orientation: IOrientation, side: ISide, width: number, height: number) => {
  const landscape_front: IImageCoords = [0, 0, width, height]
  const landscape_back: IImageCoords = [width, 0, width, height]
  const portrait_front: IImageCoords = [0, 0, width, height]
  const portrait_back: IImageCoords = [0, height, width, height]

  let imageCoords: IImageCoords = landscape_front
  let alhpaImageCoords: IImageCoords = landscape_back
  if (orientation === 'landscape') {
    imageCoords = side === 'front' ? landscape_front : landscape_back
    alhpaImageCoords = side === 'front' ? landscape_back : landscape_front
  } else {
    imageCoords = side === 'front' ? portrait_front : portrait_back
    alhpaImageCoords = side === 'front' ? portrait_back : portrait_front
  }

  return { imageCoords, alhpaImageCoords }
}
/**
 * 计算临时画布尺寸
 * @param orientation 视频排布位置
 * @param type 尺寸类型
 * @param size 尺寸
 * @returns 
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

const _window = window as any

export const requestAnimationFrame: (callback: FrameRequestCallback) => number = 
  _window.requestAnimationFrame ||
  _window.webkitRequestAnimationFrame ||
  _window.mozRequestAnimationFrame ||
  _window.oRequestAnimationFrame ||
  _window.msRequestAnimationFrame

export const cancelAnimationFrame: (handle: number) => void = 
  _window.cancelAnimationFrame ||
  _window.mozCancelAnimationFrame ||
  _window.webkitCancelAnimationFrame ||
  _window.msCancelAnimationFrame
