import Video from './video'
import { computeSize, computeImageCoord } from '../util'
import type { IConfig, IImageCoords } from '../type'

export default class CanvasRender extends Video {
  private context2d: CanvasRenderingContext2D
  private tempContext2d: CanvasRenderingContext2D
  private tempCanvasWidth: number
  private tempCanvasHeight: number
  private imageCoords: IImageCoords
  private alhpaImageCoords: IImageCoords

  constructor (config: IConfig) {
    const { onInitSuccess, onInitError } = config
     try {
      super(config)
      this.initCanvasRender()

      onInitSuccess && onInitSuccess()
    } catch (e: any) {
      onInitError && onInitError(e)
    }
  }
  /**
   * 初始化 canvas 渲染器
   */
  private initCanvasRender () {
    const { canvas, canvasWidth, canvasHeight, config } = this
    const { orientation, side } = config
    // 计算临时画布尺寸
    const tempCanvas = document.createElement('canvas')
    this.tempCanvasWidth = tempCanvas.width = computeSize(orientation, 'width', canvasWidth)
    this.tempCanvasHeight = tempCanvas.height = computeSize(orientation, 'height', canvasHeight)
    // 计算画布图片渲染位置
    const { imageCoords, alhpaImageCoords } = computeImageCoord(orientation, side, canvasWidth, canvasHeight)
    this.imageCoords = imageCoords
    this.alhpaImageCoords = alhpaImageCoords

    this.context2d = canvas.getContext('2d')
    this.tempContext2d = tempCanvas.getContext('2d')
  }
  /**
   * 绘制一帧
   */
  protected drawFrameOnce () {
    const { context2d, tempContext2d, video, canPlay, videoWidth, videoHeight, tempCanvasWidth, tempCanvasHeight, imageCoords, alhpaImageCoords } = this

    if (!context2d || !tempContext2d || !video || !canPlay || !videoWidth || !videoHeight || !tempCanvasWidth || !tempCanvasHeight || !imageCoords || !alhpaImageCoords) return

    // 获取当前帧视频并进行缩放
    tempContext2d.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, tempCanvasWidth, tempCanvasHeight)
    // 获取 RGB 通道视频图片数据
    const image = tempContext2d.getImageData(...imageCoords)
    const imageData = image.data
    // 获取 alpha 视频图片数据
    const alphaData = tempContext2d.getImageData(...alhpaImageCoords).data
    // 替换 alpha 通道
    for (let i = 3; i < imageData.length; i += 4) {
      imageData[i] = alphaData[i - 1]
    }
    // 将处理后的图片数据放回画布
    context2d.putImageData(image, 0, 0)
  }
  /**
   * 逐帧绘制当前视频内容
   */
  protected drawFrame () {
    this.drawFrameOnce()
    super.drawFrame()
  }
  /**
   * 播放结束触发
   */
  protected onEnded () {
    const { context2d, canvasWidth, canvasHeight, config } = this
    // 清除画布
    config.autoClear && context2d.clearRect(0, 0, canvasWidth, canvasHeight)
    super.onEnded()
    config.autoDestroy && this.destroy()
  }
  /**
   * 销毁
   */
  public destroy() {
    const {canvas } = this
    if (!canvas) return
    super.destroy()
    // 清除 dom
    canvas.parentNode.removeChild(canvas)
    // 释放内存
    this.canvas = null
    this.context2d = null
    this.tempContext2d = null
    this.tempCanvasWidth = null
    this.tempCanvasHeight = null
    this.imageCoords = null
    this.alhpaImageCoords = null
  }
}