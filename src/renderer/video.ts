import type { IConfig, IOptionalConfig } from '../type'
import { initCanvas, videoExists, getRequestAnimationFrame, getCancelAnimationFrame } from '../util'

const DEFAULT_CONFIG: Omit<IConfig, 'container' | 'src'> = {
  playbackRate: 1,
  muted: true,
  loop: false,
  fps: 0,
  orientation: 'landscape',
  side: 'front',
  autoShow: false,
  autoClear: true,
  autoDestroy: false,
  debug: false,
  videoFrame: false,
}

export default class Video {
  protected config: IConfig
  protected container: HTMLElement
  protected video: HTMLVideoElement
  protected canvas: HTMLCanvasElement
  protected canvasWidth = 0
  protected canvasHeight = 0
  protected videoWidth = 0
  protected videoHeight = 0
  private animationId = 0
  private onCanPlayTimes = 1
  protected canPlay = false
  private adaptAnimation: null | ((cb: Function) => number) = null
  public playing = false

  constructor (config: IConfig) {
    if (!config.container || !config.src) {
      throw new Error('[alpha-video-player-js]: container or src can not be empty！')
    }
    this.setConfig(config)
    this.container = config.container
    this.canvas = initCanvas(this.container, config.width, config.height)
    const { width, height } = this.canvas
    this.canvasWidth = width
    this.canvasHeight = height
    this.initVideo()
  }

  public get loop () {
    return this.video?.loop || false
  }

  private setConfig (config: IConfig | IOptionalConfig) {
    if (!config) return
    this.config = Object.assign({}, DEFAULT_CONFIG, this.config || {}, config) as IConfig
  }

  private initVideo () {
    const { src, playbackRate, muted, loop, crossOrigin } = this.config
  
    const video = this.video = document.createElement('video')
    video.src = src
    video.crossOrigin = crossOrigin ?? 'anonymous'
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
    video.style.position = 'absolute'
    video.style.width = '0'
    video.style.height = '0'
    video.style.overflow = 'hidden'
    video.style.pointerEvents = 'none'
    document.body.appendChild(video)

    this.bindInstance()
    this.addEvent()
    video.load()
  }
  /**
   * 绘制一帧
   */
  protected drawFrameOnce () {}
  /**
   * 逐帧绘制当前视频内容
   */
  protected drawFrame () {
    const drawFrame = this.drawFrame.bind(this)
    if (!this.adaptAnimation) {
      this.adaptAnimation = this.initAdaptAnimation()
    }
    this.animationId = this.adaptAnimation(drawFrame)
    this.playing = true
  }

  private initAdaptAnimation () {
    const { videoFrame, fps } = this.config
    const rAF = getRequestAnimationFrame()

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoFrame) {
      return (cb: Function) => this.video.requestVideoFrameCallback(cb as VideoFrameRequestCallback)
    } else if (rAF) {
      if (fps) {
        let frame = -1
        return (cb: Function) => {
          frame++
          return rAF(() => {
            if (frame % (60 / fps) === 0) {
              return cb()
            } else {
              this.animationId = this.adaptAnimation(cb)
            }
          })
        }
      } else {
        return (cb: Function) => rAF(cb as FrameRequestCallback)
      }
    } else {
      const interval = fps > 0 ? 1000 / fps : 16
      return (cb: Function) => window.setTimeout(cb, interval)
    }
  }

  /**
   * 取消逐帧绘制
   */
  private cancelDrawFrame () {
    const { animationId, config } = this
    if (!animationId) {
      return
    }

    const cAF = getCancelAnimationFrame()
    if (this.video?.cancelVideoFrameCallback && config.videoFrame) {
      this.video.cancelVideoFrameCallback(animationId)
    } else if (cAF) {
      cAF(animationId)
    } else {
      window.clearTimeout(animationId)
    }

    this.animationId = 0
    this.playing = false
  }
  /**
   * 播放
   */
  public async play (config?: IOptionalConfig) {
    videoExists(this.video)
    config && this.setConfig(config)
  
    try {
      const res = await this.video.play()
      this.drawFrame()
      return res
    } catch (error) {
      const errorEvent = new ErrorEvent('error', {
        message: `[alpha-video-player-js]: play failed, error: ${error}`,
        error,
      })
      this.config.onError?.(errorEvent)
      throw errorEvent
    }
  }
  /**
   * 暂停播放
   */
  public pause () {
    videoExists(this.video)
  
    this.video.pause()
    this.cancelDrawFrame()
  }
  /**
   * 重置播放
   */
  public reset () {  
    this.setCurrentTime(0)
  }
  /**
   * 设置播放地址
   * @param playbackRate 倍速
   */
  public setSrc (src: string) {
    videoExists(this.video)
  
    this.canPlay = false
    this.onCanPlayTimes = 1
    this.video.src = src
    this.video.load()
    this.video.currentTime = 0
  }
  /**
   * 设置播放进度
   */
  public setCurrentTime (time: number) {
    videoExists(this.video)

    this.video.currentTime = time
  }
  /**
   * 设置是否静音播放
   * @param muted 是否静音
   */
  public setMute (muted: boolean) {
    videoExists(this.video)
  
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
    videoExists(this.video)
  
    this.video.loop = loop
  }
  /**
   * 设置播放倍速
   * @param playbackRate 倍速
   */
  public setPlaybackRate (playbackRate: number) {
    videoExists(this.video)
  
    this.video.playbackRate = playbackRate
  }
  /**
   * 视频加载完毕触发
   */
  protected onLoad () {
    const { video, config } = this
    const { videoWidth, videoHeight } = video
    this.videoWidth = videoWidth
    this.videoHeight = videoHeight
    config.onLoad && config.onLoad()
  }
  
  /**
   * 视频能够播放触发
   */
  protected onCanplay () {
    const { config } = this
    this.canPlay = true

    config.autoShow && this.drawFrameOnce()

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
    config.onPause && config.onPause()
  }
  /**
   * 视频播放结束触发
   */
  protected onEnded () {
    const { config, video } = this
    video.currentTime = 0
    this.cancelDrawFrame()
    config.onEnded && config.onEnded()
  }
  /**
   * 视频播放出错触发
   */
  private onError (e: ErrorEvent) {
    const { config, video } = this
    if (config.debug && video?.error) {
      const mediaError = video.error
      console.error(
        `[alpha-video-player-js] MediaError code: ${mediaError.code}, message: ${mediaError.message || 'N/A'}.`,
        mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ? 'If the video is cross-origin, ensure the server returns "Access-Control-Allow-Origin" header.'
          : ''
      )
    }
    config.onError?.(e)
    this.destroy()
  }
  /**
   * 销毁视频
   */
  protected destroy () {
    try {
      const { config } = this    
      this.cancelDrawFrame()
      this.removeEvent()
      if (this.video) {
        this.video.pause()
        this.video.src = ''
        this.video.load()
        this.video.parentNode?.removeChild(this.video)
      }
      
      config?.onDestroy?.()
      this.config = null
      this.container = null
      this.video = null
      this.animationId = null
    } catch (e) {
      if (this.config?.debug) {
        console.error('[alpha-video-player-js] destroy error:', e)
      }
    }
  }
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
    let { video, onLoad, onCanplay, onPlay, onPause, onEnded, onError } = this
    video.removeEventListener('loadedmetadata', onLoad)
    video.removeEventListener('play', onPlay)
    video.removeEventListener('canplaythrough', onCanplay)
    video.removeEventListener('pause', onPause)
    video.removeEventListener('ended', onEnded)
    video.removeEventListener('error', onError)
  }
}