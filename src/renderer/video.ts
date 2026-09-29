import type { IConfig, IOptionalConfig, IUpdateConfig } from '../type'
import { TRANSPARENT_VIDEO_POSTER } from '../constants'
import { playerDestroyedError } from '../error'
import { resizeCanvas, computeDisplayRatio, getDpr, videoExists, getRequestAnimationFrame, getCancelAnimationFrame, resolvePlayerConfig } from '../util'

export default class Video {
  protected config: IConfig | null
  protected container: HTMLElement | null
  protected video: HTMLVideoElement | null
  protected canvas: HTMLCanvasElement | null
  protected canvasWidth = 0
  protected canvasHeight = 0
  protected videoWidth = 0
  protected videoHeight = 0
  private animationId: number | null = null
  private animationGeneration = 0
  private playRequestId = 0
  private playPending = false
  private sourceGeneration = 0
  private resumeOnReady = false
  private destroyed = false
  private onCanPlayTimes = 1
  private readyPromise: Promise<void> = Promise.resolve()
  private resolveReady: (() => void) | null = null
  private transitionStyle: { position: string, left: string, top: string, zIndex: string } | null = null
  protected canPlay = false
  private cancelAnimation: null | ((id: number) => void) = null
  private renderVideoDirectly = false
  public playing = false

  constructor (config: IConfig, renderVideoDirectly = false, canvas: HTMLCanvasElement | null = null) {
    if (!config.container) {
      throw new Error('[alpha-video-player-js]: container can not be empty！')
    }
    this.renderVideoDirectly = renderVideoDirectly
    this.setConfig(config)
    this.container = config.container
    this.canvas = canvas
    if (canvas) {
      const { width, height } = this.canvas
      this.canvasWidth = width
      this.canvasHeight = height
    }
    try {
      if (config.src) this.initVideo()
    } catch (error) {
      this.destroy(false)
      throw error
    }
  }

  public get loop () {
    return this.video?.loop || false
  }

  public get playRequested () {
    return this.playing || this.playPending || this.resumeOnReady
  }

  public whenReady () {
    return this.canPlay ? Promise.resolve() : this.readyPromise
  }

  public setOutputVisible (visible: boolean) {
    const output = this.renderVideoDirectly ? this.video : this.canvas
    if (output) output.style.visibility = visible ? 'visible' : 'hidden'
  }

  public setOutputTransitioning (transitioning: boolean) {
    const output = this.renderVideoDirectly ? this.video : this.canvas
    if (!output) return
    if (transitioning) {
      if (!this.transitionStyle) {
        this.transitionStyle = {
          position: output.style.position || '',
          left: output.style.left || '',
          top: output.style.top || '',
          zIndex: output.style.zIndex || '',
        }
      }
      output.style.position = 'absolute'
      output.style.left = '0'
      output.style.top = '0'
      output.style.zIndex = '1'
      return
    }
    if (!this.transitionStyle) return
    output.style.position = this.transitionStyle.position
    output.style.left = this.transitionStyle.left
    output.style.top = this.transitionStyle.top
    output.style.zIndex = this.transitionStyle.zIndex
    this.transitionStyle = null
  }

  public prepareOutput () {
    if (!this.renderVideoDirectly && this.canPlay) this.drawFrameOnce()
  }

  private setConfig (config: IConfig | IOptionalConfig) {
    if (!config) return
    this.config = resolvePlayerConfig(config, this.config)
  }

  public updateConfig (config: IUpdateConfig) {
    if (this.destroyed || !this.config) throw playerDestroyedError('updateConfig')
    const previous = this.config
    const wasPlaying = this.playing
    const playRequested = this.playRequested
    const sourceChanged = config.src !== undefined && config.src !== previous.src
    const resumeAfterSourceChange = sourceChanged && playRequested
    const frameDriverChanged = (config.fps !== undefined && config.fps !== previous.fps) ||
      (config.videoFrame !== undefined && config.videoFrame !== previous.videoFrame)
    this.setConfig(config)
    const next = this.config

    if (sourceChanged) this.setSrc(config.src!)
    if (!this.video) return
    if (config.muted !== undefined) this.setMute(next.muted!)
    if (config.loop !== undefined) this.setLoop(next.loop!)
    if (config.playbackRate !== undefined) this.setPlaybackRate(next.playbackRate!)
    if (resumeAfterSourceChange) {
      this.resumeOnReady = true
      const generation = this.sourceGeneration
      void this.whenReady().then(() => {
        if (this.destroyed || generation !== this.sourceGeneration || !this.resumeOnReady) return
        this.resumeOnReady = false
        return this.play()
      }).catch(() => {})
    }
    if (frameDriverChanged && !sourceChanged && wasPlaying && !this.renderVideoDirectly && !this.video.paused) {
      this.cancelDrawFrame()
      this.playing = true
      this.drawFrame()
    }
    this.onConfigUpdated(previous, next)
  }

  protected onConfigUpdated (previous: IConfig, next: IConfig) {
    if (this.video && previous.poster !== next.poster) {
      this.video.poster = next.poster || TRANSPARENT_VIDEO_POSTER
    }
    if (
      previous.width !== next.width || previous.height !== next.height ||
      previous.autoResize !== next.autoResize || previous.orientation !== next.orientation ||
      previous.alphaScale !== next.alphaScale || previous.alphaAlign !== next.alphaAlign
    ) {
      this.resizeOutput()
    }
    if (previous.autoShow !== next.autoShow && this.video) {
      if (this.renderVideoDirectly) {
        this.setNativeVideoVisible(this.playing || !!next.autoShow)
      } else if (next.autoShow && this.canPlay) {
        this.drawFrameOnce()
      }
    }
  }

  private initVideo () {
    const { src, poster, playbackRate, muted, loop, crossOrigin } = this.config
    this.resetReady()
  
    const video = this.video = document.createElement('video')
    video.crossOrigin = crossOrigin ?? 'anonymous'
    // 用户 poster 优先；透明兜底阻止 Android WebView 注入内部默认 poster。
    video.poster = poster || TRANSPARENT_VIDEO_POSTER
    video.src = src
    video.autoplay = false
    video.preload = 'auto'
    video.playbackRate = playbackRate
    video.loop = loop
    video.muted = muted
    if (muted) {
      video.setAttribute('muted', '')
    }

    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.setAttribute('x-webkit-airplay', '')
    if (this.renderVideoDirectly) {
      const width = this.config.width || this.container.offsetWidth
      const height = this.config.height || this.container.offsetHeight
      video.style.display = 'block'
      video.style.width = width ? `${width}px` : '100%'
      video.style.height = height ? `${height}px` : '100%'
      video.style.visibility = this.config.autoShow ? 'visible' : 'hidden'
      video.style.pointerEvents = 'none'
      this.container.appendChild(video)
    } else {
      video.style.position = 'absolute'
      video.style.width = '0'
      video.style.height = '0'
      video.style.overflow = 'hidden'
      video.style.pointerEvents = 'none'
      document.body.appendChild(video)
    }

    this.bindInstance()
    this.addEvent()
    video.load()
  }

  private resetReady () {
    this.resolveReady?.()
    this.readyPromise = new Promise(resolve => {
      this.resolveReady = resolve
    })
  }
  /**
   * 绘制一帧
   */
  protected drawFrameOnce () {}
  /**
   * 逐帧绘制当前视频内容
   */
  protected drawFrame () {
    if (this.destroyed || !this.playing || this.animationId !== null) return
    const generation = this.animationGeneration
    const { request, cancel } = this.initAdaptAnimation()
    this.cancelAnimation = cancel
    const interval = this.config.fps > 0 ? 1000 / this.config.fps : 0
    let lastFrameTime: number | undefined
    const active = () => !this.destroyed && this.playing && generation === this.animationGeneration &&
      this.video && !this.video.paused && !this.video.ended
    const frame = (timestamp?: number) => {
      // 已经进入队列的旧回调也必须失效，不能在暂停/销毁后重新续订帧循环。
      if (!active()) return
      this.animationId = null
      try {
        if (timestamp === undefined || lastFrameTime === undefined || timestamp - lastFrameTime >= interval) {
          this.drawFrameOnce()
          lastFrameTime = lastFrameTime === undefined || timestamp === undefined || !interval
            ? timestamp
            : timestamp - (timestamp - lastFrameTime) % interval
        }
      } catch (error) {
        this.onError(error)
        return
      }
      if (active()) this.animationId = request(frame)
    }
    frame()
  }

  private initAdaptAnimation () {
    const { videoFrame, fps } = this.config
    const rAF = getRequestAnimationFrame()
    const cAF = getCancelAnimationFrame()
    const video = this.video

    if (videoFrame && video.requestVideoFrameCallback && video.cancelVideoFrameCallback) {
      return {
        request: (cb: FrameRequestCallback) => video.requestVideoFrameCallback(cb),
        cancel: (id: number) => video.cancelVideoFrameCallback(id),
      }
    }
    if (rAF && cAF) return {
      request: (cb: FrameRequestCallback) => rAF.call(window, cb),
      cancel: (id: number) => cAF.call(window, id),
    }
    const interval = fps > 0 ? 1000 / fps : 16
    return {
      request: (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), interval),
      cancel: (id: number) => window.clearTimeout(id),
    }
  }

  /**
   * 取消逐帧绘制
   */
  private cancelDrawFrame () {
    this.animationGeneration++
    // 保存实际调度器的取消函数，避免 play(config) 改变配置后取消到错误的队列。
    try {
      if (this.animationId !== null) this.cancelAnimation?.(this.animationId)
    } finally {
      this.animationId = null
      this.cancelAnimation = null
      this.playing = false
    }
  }
  /**
   * 播放
   */
  public async play (config?: IOptionalConfig) {
    videoExists(this.video, 'play', this.destroyed)
    config && this.setConfig(config)
    this.resumeOnReady = false
    const video = this.video
    const requestId = ++this.playRequestId
    this.playPending = true
  
    try {
      const res = await video.play()
      if (this.destroyed || requestId !== this.playRequestId || video !== this.video) return res
      this.playPending = false
      if (video.paused || video.ended) return res
      this.cancelDrawFrame()
      this.playing = true
      if (this.renderVideoDirectly) {
        this.setNativeVideoVisible(true)
      } else {
        this.drawFrame()
      }
      return res
    } catch (error) {
      // pause / setSrc / destroy 已主动使该请求失效，晚到的浏览器拒绝只是取消结果。
      if (this.destroyed || requestId !== this.playRequestId || video !== this.video) return
      this.playPending = false
      try {
        this.config?.onError?.(error)
      } finally {
        // 业务回调异常不能替换调用方需要处理的原生播放错误。
        throw error
      }
    }
  }
  /**
   * 暂停播放
   */
  public pause () {
    videoExists(this.video, 'pause', this.destroyed)
  
    this.playRequestId++
    this.playPending = false
    this.sourceGeneration++
    this.resumeOnReady = false
    this.cancelDrawFrame()
    this.video.pause()
  }
  /**
   * 重置播放
   */
  public reset () {  
    videoExists(this.video, 'reset', this.destroyed)
    this.video.currentTime = 0
  }
  /**
   * 设置播放地址
   * @param playbackRate 倍速
   */
  public setSrc (src: string) {
    if (this.destroyed) throw playerDestroyedError('setSrc')
    this.playRequestId++
    this.playPending = false
    this.sourceGeneration++
    this.resumeOnReady = false
    this.cancelDrawFrame()
    this.canPlay = false
    this.onCanPlayTimes = 1
    this.config.src = src
    if (this.renderVideoDirectly) {
      this.setNativeVideoVisible(!!this.config.autoShow)
    }

    if (!this.video) {
      this.initVideo()
      return
    }

    this.resetReady()
    this.video.src = src
    this.video.load()
    this.video.currentTime = 0
  }
  /**
   * 设置播放进度
   */
  public setCurrentTime (time: number) {
    videoExists(this.video, 'setCurrentTime', this.destroyed)

    this.video.currentTime = time
  }
  /**
   * 设置是否静音播放
   * @param muted 是否静音
   */
  public setMute (muted: boolean) {
    videoExists(this.video, 'setMute', this.destroyed)
  
    this.video.muted = muted
    if (muted) {
      this.video.setAttribute('muted', '')
    } else {
      this.video.removeAttribute('muted')
    }
  }
  /**
   * 设置是否循环播放
   * @param loop 是否循环
   */
  public setLoop (loop: boolean) {
    videoExists(this.video, 'setLoop', this.destroyed)
  
    this.video.loop = loop
  }
  /**
   * 设置播放倍速
   * @param playbackRate 倍速
   */
  public setPlaybackRate (playbackRate: number) {
    videoExists(this.video, 'setPlaybackRate', this.destroyed)
  
    this.video.playbackRate = playbackRate
  }
  /**
   * 视频加载完毕触发。
   * 若配置了 autoResize，根据视频实际比例自动调整渲染目标尺寸。
   */
  protected onLoad () {
    const { video, config, canvas } = this
    this.videoWidth = video.videoWidth
    this.videoHeight = video.videoHeight

    this.resizeOutput()

    config.onLoad && config.onLoad()
  }

  private resizeOutput () {
    const { video, config, canvas, container } = this
    if (!video || !config) return
    const dpr = getDpr()
    const defaultWidth = config.width || container?.offsetWidth || (canvas ? canvas.width / dpr : video.videoWidth)
    const defaultHeight = config.height || container?.offsetHeight || (canvas ? canvas.height / dpr : video.videoHeight)

    let newWidth = defaultWidth
    let newHeight = defaultHeight

    if (config.autoResize && (canvas || this.renderVideoDirectly) && video.videoWidth > 0 && video.videoHeight > 0) {
      const videoRatio = computeDisplayRatio(
        video.videoWidth,
        video.videoHeight,
        config.orientation!,
        config.alphaScale,
        config.alphaAlign,
      )
      const boxWidth = defaultWidth || video.videoWidth
      const boxHeight = defaultHeight || video.videoHeight

      let fixDimension: 'width' | 'height'
      if (config.autoResize === 'width' || config.autoResize === 'height') {
        fixDimension = config.autoResize
      } else {
        // contain: 视频比盒子更宽（ratio 更大）→ 以宽为准缩高；否则以高为准缩宽
        const boxRatio = boxWidth / boxHeight
        fixDimension = videoRatio >= boxRatio ? 'width' : 'height'
      }

      newWidth = fixDimension === 'width' ? boxWidth : Math.round(boxHeight * videoRatio)
      newHeight = fixDimension === 'width' ? Math.round(boxWidth / videoRatio) : boxHeight
    }

    const targetW = newWidth * dpr
    const targetH = newHeight * dpr
    if (canvas && newWidth && newHeight && (targetW !== this.canvasWidth || targetH !== this.canvasHeight)) {
      resizeCanvas(canvas, newWidth, newHeight)
      this.canvasWidth = canvas.width
      this.canvasHeight = canvas.height
      this.onCanvasResized()
    } else if (this.renderVideoDirectly) {
      video.style.width = newWidth ? `${newWidth}px` : '100%'
      video.style.height = newHeight ? `${newHeight}px` : '100%'
    }
  }

  /**
   * canvas 尺寸因 autoResize 发生变化后调用，
   * 子类在此更新依赖尺寸的资源（gl.viewport / tempCanvas 等）。
   */
  protected onCanvasResized () {}

  /**
   * 视频能够播放触发
   */
  protected onCanplay () {
    const { config } = this
    this.canPlay = true
    this.resolveReady?.()
    this.resolveReady = null

    try {
      if (this.renderVideoDirectly) {
        config.autoShow && this.setNativeVideoVisible(true)
      } else {
        config.autoShow && this.drawFrameOnce()
      }
    } catch (error) {
      this.onError(error)
      return
    }

    // video canplay 回调会循环触发，此处保证用户 onCanPlay 回调仅首次执行
    if (this.onCanPlayTimes === 1 && config.onCanPlay) {
      config.onCanPlay()
    }
    if (this.onCanPlayTimes !== 1 && config.loop && config.onLoop) {
      config.onLoop()
    }
    this.onCanPlayTimes++
  }
  /**
   * 视频播放触发
   */
  private onPlay () {
    const { config } = this
    config.onPlay && config.onPlay()
  }
  /**
   * 视频暂停触发
   */
  private onPause () {
    const { config } = this
    if (this.video?.paused) {
      this.playRequestId++
      this.playPending = false
      this.cancelDrawFrame()
    }
    config?.onPause?.()
  }
  /**
   * 视频播放结束触发
   */
  protected onEnded () {
    const { config, video } = this
    this.playRequestId++
    this.playPending = false
    video.currentTime = 0
    this.cancelDrawFrame()
    try {
      config.onEnded?.()
    } finally {
      if (config.autoDestroy) this.destroy()
    }
  }
  /**
   * 原生视频模式通过可见性模拟 canvas 的 autoShow / autoClear 行为。
   */
  protected setNativeVideoVisible (visible: boolean) {
    if (this.renderVideoDirectly && this.video) {
      this.video.style.visibility = visible ? 'visible' : 'hidden'
    }
  }
  /**
   * 视频播放出错触发
   */
  protected onError (e: unknown) {
    const { config, video } = this
    if (!config || this.destroyed) return
    if (config.debug) {
      console.error(video?.error ?? e)
    }
    try {
      config.onError?.(e)
    } finally {
      this.destroy()
    }
  }
  /**
   * 销毁视频
   */
  public destroy (notify = true) {
    if (this.destroyed) return
    this.destroyed = true
    this.playRequestId++
    this.playPending = false
    this.sourceGeneration++
    this.resumeOnReady = false
    const { config, video, canvas } = this
    let cleanupError: unknown
    const cleanup = (task: () => void) => {
      try {
        task()
      } catch (error) {
        cleanupError ??= error
      }
    }

    cleanup(() => this.cancelDrawFrame())
    cleanup(() => this.resolveReady?.())
    this.resolveReady = null
    cleanup(() => this.removeEvent())
    cleanup(() => {
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    })
    cleanup(() => video?.parentNode?.removeChild(video))
    cleanup(() => this.releaseRenderResources())
    cleanup(() => canvas?.parentNode?.removeChild(canvas))
    cleanup(() => {
      if (canvas) canvas.width = canvas.height = 0
    })

    this.config = null
    this.container = null
    this.video = null
    this.canvas = null
    this.transitionStyle = null
    this.canPlay = false

    // 回调最后执行，重入 destroy 或抛错均不会中断资源回收。
    if (notify) cleanup(() => config?.onDestroy?.())
    if (cleanupError && config?.debug) {
      console.error('[alpha-video-player-js] destroy error:', cleanupError)
    }
  }

  protected releaseRenderResources () {}
  /**
   * 绑定实例
   */
  private bindInstance () {
    const { onLoad, onCanplay, onPlay, onPause, onEnded, onError }= this
    this.onLoad = onLoad.bind(this)
    this.onCanplay = onCanplay.bind(this)
    this.onPlay = onPlay.bind(this)
    this.onPause = onPause.bind(this)
    this.onEnded = onEnded.bind(this)
    this.onError = onError.bind(this)
  }
  /**
   * 监听 video 事件
   */
  private addEvent () {
    const { video, onLoad, onCanplay, onPlay, onPause, onEnded, onError } = this
    video.addEventListener('loadedmetadata', onLoad)
    video.addEventListener('canplaythrough', onCanplay)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
  }
  /**
   * 取消监听 video 事件
   */
  private removeEvent () {
    const { video, onLoad, onCanplay, onPlay, onPause, onEnded, onError } = this
    if (!video) return
    video.removeEventListener('loadedmetadata', onLoad)
    video.removeEventListener('play', onPlay)
    video.removeEventListener('canplaythrough', onCanplay)
    video.removeEventListener('pause', onPause)
    video.removeEventListener('ended', onEnded)
    video.removeEventListener('error', onError)
  }
}
