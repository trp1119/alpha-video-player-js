import WebGLRender from './renderer/webgl-render'
import CanvasRender from './renderer/canvas-render'
import NativeVideoRender from './renderer/native-video-render'
import { initCanvas, resolvePlayerConfig } from './util'
import type { IConfig, IOptionalConfig, IUpdateConfig } from './type'

export type { IConfig, IOptionalConfig, IUpdateConfig }
export type { IAlphaAlign, IOrientation, ISide } from './type'

type IRenderer = NativeVideoRender | WebGLRender | CanvasRender

const RENDERER_CONFIG_KEYS: Array<keyof IUpdateConfig> = [
  'crossOrigin',
]

export default class Render {
  private render: IRenderer | null = null
  private config: IConfig | null = null
  private outgoingRender: IRenderer | null = null
  private outgoingConfig: IConfig | null = null
  private transitionWasPlaying = false
  private transitionGeneration = 0

  constructor (config: IConfig) {
    this.config = resolvePlayerConfig(config)
    this.render = this.createRenderer(this.config, true)
  }

  private createRenderer (config: IConfig, notifyInitSuccess = false): IRenderer | null {
    let renderer: IRenderer | null = null
    let canvas: HTMLCanvasElement | null = null
    let gl: WebGLRenderingContext | null = null
    try {
      if (!config.container) throw new Error('[alpha-video-player-js]: container can not be empty！')
      if (config.alphaScale === 0) {
        renderer = new NativeVideoRender(config)
      } else {
        canvas = initCanvas(config.container, config.width, config.height)
        // 在正式画布上选择上下文，避免每个实例额外占用一个探测用 WebGL 上下文。
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
        renderer = gl
          ? new WebGLRender(config, canvas, gl)
          : new CanvasRender(config, canvas)
      }
      if (notifyInitSuccess) config.onInitSuccess?.()
      return renderer
    } catch (error) {
      renderer?.destroy(false)
      if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
      if (canvas) {
        canvas.parentNode?.removeChild(canvas)
        canvas.width = canvas.height = 0
      }
      if (config.onInitError) config.onInitError(error as ErrorEvent)
      else throw error
      return null
    }
  }

  private rendererUpdates (config: IConfig): IUpdateConfig {
    const updates = Object.assign({}, config) as IOptionalConfig
    delete updates.container
    return updates
  }

  private finishTransition (renderer: IRenderer, generation: number) {
    if (generation !== this.transitionGeneration || this.render !== renderer || !this.outgoingRender) return
    const outgoing = this.outgoingRender
    const config = this.config
    renderer.prepareOutput()
    renderer.setOutputTransitioning(false)
    renderer.setOutputVisible(true)
    renderer.updateConfig({ onError: config?.onError, onDestroy: config?.onDestroy })
    this.outgoingRender = null
    this.outgoingConfig = null
    this.transitionWasPlaying = false
    outgoing.destroy(false)
  }

  private rollbackTransition (renderer: IRenderer, generation: number) {
    if (generation !== this.transitionGeneration || this.render !== renderer || !this.outgoingRender) return
    const fallback = this.outgoingRender
    const fallbackConfig = this.outgoingConfig
    const resume = this.transitionWasPlaying
    this.transitionGeneration++
    this.render = fallback
    this.config = fallbackConfig
    this.outgoingRender = null
    this.outgoingConfig = null
    this.transitionWasPlaying = false
    renderer.destroy(false)
    if (fallbackConfig) fallback.updateConfig(this.rendererUpdates(fallbackConfig))
    fallback.setOutputVisible(true)
    if (resume) void fallback.play().catch(() => {})
  }

  private cancelTransition () {
    if (!this.outgoingRender) return false
    const candidate = this.render
    const fallback = this.outgoingRender
    const fallbackConfig = this.outgoingConfig
    const resume = this.transitionWasPlaying
    this.transitionGeneration++
    candidate?.destroy(false)
    this.render = fallback
    this.config = fallbackConfig
    this.outgoingRender = null
    this.outgoingConfig = null
    this.transitionWasPlaying = false
    if (fallbackConfig) fallback.updateConfig(this.rendererUpdates(fallbackConfig))
    fallback.setOutputVisible(true)
    return resume
  }

  private activateTransition (renderer: IRenderer, generation: number, resume: boolean) {
    if (!this.config?.src) return
    void renderer.whenReady().then(async () => {
      if (generation !== this.transitionGeneration || this.render !== renderer) return
      if (resume) await renderer.play()
      if (generation !== this.transitionGeneration || this.render !== renderer) return
      if (resume || this.config?.autoShow) this.finishTransition(renderer, generation)
    }).catch(() => {
      this.rollbackTransition(renderer, generation)
    })
  }

  private startTransition (next: IConfig, previous: IConfig, resumePlayback?: boolean) {
    const outgoing = this.render
    if (!outgoing) {
      this.config = next
      this.render = this.createRenderer(next)
      return
    }

    const generation = ++this.transitionGeneration
    let renderer: IRenderer | null = null
    const transitionConfig = Object.assign({}, next, {
      onDestroy: undefined,
      onError: (error: unknown) => {
        try {
          const onError = this.config ? this.config.onError : next.onError
          onError?.(error)
        } finally {
          if (renderer) this.rollbackTransition(renderer, this.transitionGeneration)
        }
      },
    })
    renderer = this.createRenderer(transitionConfig)
    if (!renderer) return

    renderer.setOutputTransitioning(true)
    renderer.setOutputVisible(false)
    const wasPlaying = resumePlayback ?? outgoing.playing
    if (wasPlaying) {
      // 内部换挡不应伪装成用户主动暂停，候选激活后仍按新配置正常上报播放事件。
      outgoing.updateConfig({ onPause: undefined })
      outgoing.pause()
    }
    this.outgoingRender = outgoing
    this.outgoingConfig = previous
    this.transitionWasPlaying = wasPlaying
    this.render = renderer
    this.config = next
    this.activateTransition(renderer, generation, wasPlaying)
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
    if (config) this.updateConfig(config)
    const renderer = this.getRenderer()
    const result = await renderer.play()
    if (this.outgoingRender && this.render === renderer) {
      await renderer.whenReady()
      this.finishTransition(renderer, this.transitionGeneration)
    }
    return result
  }

  public updateConfig (config: IUpdateConfig) {
    if (!this.config) throw new Error('[alpha-video-player-js]: player has been destroyed.')
    let previous = this.config
    const updates = Object.assign({}, config)
    if (updates.src === undefined) delete updates.src
    const next = resolvePlayerConfig(Object.assign({}, updates, { container: previous.container }), previous)
    const requiresReplacement = (current: IConfig) =>
      (current.alphaScale === 0) !== (next.alphaScale === 0) ||
      (current.alphaScale === 0 && current.src !== next.src) ||
      RENDERER_CONFIG_KEYS.some(key => current[key] !== next[key])

    if (this.outgoingRender && requiresReplacement(previous)) {
      const resume = this.cancelTransition()
      previous = this.config!
      if (requiresReplacement(previous)) {
        this.startTransition(next, previous, resume)
        return
      }
      this.config = next
      this.getRenderer().updateConfig(this.rendererUpdates(next))
      if (resume) void this.getRenderer().play().catch(() => {})
      return
    }

    if (!this.render || requiresReplacement(previous)) {
      // 新 renderer 首帧准备完成前保留旧输出，避免配置切换暴露空白画面。
      this.startTransition(next, previous)
      return
    }
    this.config = next
    const rendererConfig = Object.assign({}, updates)
    if (this.outgoingRender) {
      delete rendererConfig.onError
      delete rendererConfig.onDestroy
    }
    this.getRenderer().updateConfig(rendererConfig)
    if (this.outgoingRender && previous.src !== next.src) {
      const generation = ++this.transitionGeneration
      this.activateTransition(this.getRenderer(), generation, this.transitionWasPlaying)
    }
  }

  public pause () {
    this.getRenderer().pause()
    this.outgoingRender?.pause()
  }

  public destroy () {
    this.transitionGeneration++
    if (this.outgoingRender && this.render) {
      this.render.updateConfig({ onError: this.config?.onError, onDestroy: this.config?.onDestroy })
    }
    this.render?.destroy()
    this.outgoingRender?.destroy(false)
    this.render = null
    this.outgoingRender = null
    this.outgoingConfig = null
    this.config = null
  }

  public reset () {
    this.getRenderer().reset()
  }

  public setSrc (src: string) {
    this.getRenderer().setSrc(src)
    if (this.config) this.config.src = src
    if (this.outgoingRender) {
      const generation = ++this.transitionGeneration
      this.activateTransition(this.getRenderer(), generation, this.transitionWasPlaying)
    }
  }

  public setCurrentTime(time: number) {
    this.getRenderer().setCurrentTime(time)
  }

  public setMute (muted: boolean) {
    this.getRenderer().setMute(muted)
    if (this.config) this.config.muted = muted
  }

  public setLoop (loop: boolean) {
    this.getRenderer().setLoop(loop)
    if (this.config) this.config.loop = loop
  }

  public setPlaybackRate (playbackRate: number) {
    this.getRenderer().setPlaybackRate(playbackRate)
    if (this.config) this.config.playbackRate = playbackRate
  }
}

/** 核心类实例类型（`new Render(...)` 的实例），便于业务侧标注 ref / getPlayer() 等 */
export type IAlphaVideoPlayer = InstanceType<typeof Render>
