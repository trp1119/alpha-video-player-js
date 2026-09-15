import WebGLRender from './renderer/webgl-render'
import CanvasRender from './renderer/canvas-render'
import NativeVideoRender from './renderer/native-video-render'
import { initCanvas, resolveAlphaScale } from './util'
import type { IConfig, IOptionalConfig } from './type'

export type { IConfig, IOptionalConfig }
export type { IAlphaAlign, IOrientation, ISide } from './type'

export default class Render {
  private render: NativeVideoRender | WebGLRender | CanvasRender | null = null
  constructor (config: IConfig) {
    const alphaScale = resolveAlphaScale(config.alphaScale)
    const resolvedConfig = Object.assign({}, config, { alphaScale })

    let canvas: HTMLCanvasElement | null = null
    let gl: WebGLRenderingContext | null = null
    try {
      if (!config.container) throw new Error('[alpha-video-player-js]: container can not be empty！')
      if (alphaScale === 0) {
        this.render = new NativeVideoRender(resolvedConfig)
      } else {
        canvas = initCanvas(config.container, config.width, config.height)
        // 在正式画布上选择上下文，避免每个实例额外占用一个探测用 WebGL 上下文。
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
        this.render = gl
          ? new WebGLRender(resolvedConfig, canvas, gl)
          : new CanvasRender(resolvedConfig, canvas)
      }
      config.onInitSuccess?.()
    } catch (error) {
      this.render?.destroy(false)
      if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
      if (canvas) {
        canvas.parentNode?.removeChild(canvas)
        canvas.width = canvas.height = 0
      }
      if (config.onInitError) config.onInitError(error as ErrorEvent)
      else throw error
      return
    }
  }

  private getRenderer () {
    if (!this.render) throw new Error('[alpha-video-player-js]: player is not initialized.')
    return this.render
  }

  get playing () {
    return this.render?.playing || false
  }

  get loop () {
    return this.render?.loop || false
  }

  public async play (config?: IOptionalConfig) {
    return this.getRenderer().play(config)
  }
  

  public pause () {
    this.getRenderer().pause()
  }

  public destroy () {
    this.render?.destroy()
    this.render = null
  }

  public reset () {
    this.getRenderer().reset()
  }

  public setSrc (src: string) {
    this.getRenderer().setSrc(src)
  }

  public setCurrentTime(time: number) {
    this.getRenderer().setCurrentTime(time)
  }

  public setMute (muted: boolean) {
    this.getRenderer().setMute(muted)
  }

  public setLoop (loop: boolean) {
    this.getRenderer().setLoop(loop)
  }

  public setPlaybackRate (playbackRate: number) {
    this.getRenderer().setPlaybackRate(playbackRate)
  }
}

/** 核心类实例类型（`new Render(...)` 的实例），便于业务侧标注 ref / getPlayer() 等 */
export type IAlphaVideoPlayer = InstanceType<typeof Render>
