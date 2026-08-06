import Video from './video'
import { computeLayoutRects, videoFrameReady } from '../util'
import type { IConfig } from '../type'

export default class CanvasRender extends Video {
  private context2d: CanvasRenderingContext2D | null
  private alphaCanvas: HTMLCanvasElement | null
  private alphaContext2d: CanvasRenderingContext2D | null

  constructor (config: IConfig) {
    const { onInitSuccess, onInitError } = config
     try {
      super(config)
      this.initCanvasRender()

      onInitSuccess && onInitSuccess()
    } catch (e: any) {
      if (onInitError) {
        onInitError(e)
      } else {
        throw e
      }
    }
  }
  /**
   * 初始化 canvas 渲染器
   */
  private initCanvasRender () {
    const { canvas } = this
    this.context2d = canvas.getContext('2d')
    this.resizeAlphaCanvas()
  }
  protected onCanvasResized () {
    this.context2d = this.canvas.getContext('2d')
    this.resizeAlphaCanvas()
  }

  private resizeAlphaCanvas () {
    const alphaCanvas = this.alphaCanvas || document.createElement('canvas')
    alphaCanvas.width = this.canvasWidth
    alphaCanvas.height = this.canvasHeight
    this.alphaCanvas = alphaCanvas
    this.alphaContext2d = alphaCanvas.getContext('2d')
  }

  /**
   * 绘制一帧
   */
  protected drawFrameOnce () {
    const { context2d, alphaContext2d, video, canPlay, videoWidth, videoHeight, canvasWidth, canvasHeight, config } = this

    if (!context2d || !alphaContext2d || !video || !canPlay || !videoFrameReady(video) || !videoWidth || !videoHeight || !canvasWidth || !canvasHeight) return

    const { rgb, alpha } = computeLayoutRects(config.orientation, config.side, config.alphaScale, config.alphaAlign)
    context2d.drawImage(
      video,
      rgb.x * videoWidth,
      rgb.y * videoHeight,
      rgb.width * videoWidth,
      rgb.height * videoHeight,
      0,
      0,
      canvasWidth,
      canvasHeight,
    )
    const image = context2d.getImageData(0, 0, canvasWidth, canvasHeight)
    const imageData = image.data
    alphaContext2d.drawImage(
      video,
      alpha.x * videoWidth,
      alpha.y * videoHeight,
      alpha.width * videoWidth,
      alpha.height * videoHeight,
      0,
      0,
      canvasWidth,
      canvasHeight,
    )
    const alphaData = alphaContext2d.getImageData(0, 0, canvasWidth, canvasHeight).data
    // 替换 alpha 通道（取 R 通道，与 WebGL shader 一致）
    for (let i = 3; i < imageData.length; i += 4) {
      imageData[i] = alphaData[i - 3]
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
    canvas.parentNode?.removeChild(canvas)
    // 释放内存
    this.canvas = null
    this.context2d = null
    this.alphaCanvas = null
    this.alphaContext2d = null
  }
}
