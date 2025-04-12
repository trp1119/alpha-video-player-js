import type { IConfig, IOptionalConfig } from '../type'
import { initCanvas, videoExists, requestAnimationFrame, cancelAnimationFrame } from '../util'

const DEFULT_CONFIG: Omit<IConfig, 'container' | 'src'> = {
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
    // 合并配置项
    this.setConfig(config)
    this.container = config.container
    // 创建画布
    this.canvas = initCanvas(this.container, config.width, config.height)
    const { width, height } = this.canvas
    this.canvasWidth = width
    this.canvasHeight = height
    // 初始化视频
    this.initVideo()
  }

  public get loop () {
    return this.video?.loop || false
  }

  /**
   * 设置配置
   */
  private setConfig (config: IConfig | IOptionalConfig) {
    if (!config) return
    this.config = Object.assign({
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
    }, this.config || {}, config) as IConfig
  }

  /**
   * 初始化视频
   */
  private initVideo () {
    const { src, playbackRate, muted, loop } = this.config
  
    const video = this.video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.autoplay = false
    video.preload = 'auto'
    video.playbackRate = playbackRate
    video.loop = loop
    video.muted = muted

    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.setAttribute('x-webkit-airplay', '')
    video.style.display = 'none'
    document.body.appendChild(video)
  
    video.load()

    this.bindInstance()
    this.addEvent()
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

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoFrame) {
      return (cb: Function) => this.video.requestVideoFrameCallback(cb as VideoFrameRequestCallback)
    } else if (requestAnimationFrame) {
      if (fps) {
        let frame = -1
        return (cb: Function) => {
          frame++
          return requestAnimationFrame(() => {
            if (frame % (60 / fps) === 0) {
              return cb()
            } else {
              this.animationId = this.adaptAnimation(cb)
            }
          })
        }
      } else {
        return (cb: Function) => requestAnimationFrame(cb as FrameRequestCallback)
      }
    } else {
      return (cb: Function) => window.setTimeout(cb, 1000 / fps)
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

    if (this.video.cancelVideoFrameCallback && config.videoFrame) {
      this.video.cancelVideoFrameCallback(animationId)
    } else if (cancelAnimationFrame) {
      cancelAnimationFrame(animationId)
    } else {
      window.clearTimeout(animationId)
    }

    this.animationId = 0
    this.playing = false
  }
  /**
   * 播放
   */
  public play (config?: IOptionalConfig) {
    videoExists(this.video)

    config && this.setConfig(config)
  
    this.video.play()
    this.drawFrame()
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
  /*
  /**
   * 设置是否静音播放
   * @param muted 是否静音
   */
  public setMute (muted: boolean) {
    videoExists(this.video)
  
    this.video.muted = muted
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
    const { config } = this
    config.onError && config.onError(e)
    this.destroy()
  }
  /**
   * 销毁视频
   */
  protected destroy () {
    try {
      const { config } = this    
      // 取消逐帧绘制
      this.cancelDrawFrame()
      // 取消事件监听
      this.removeEvent()
      // 清除 dom
      this.video.pause()
      this.video.src = ''
      this.video.load()
      this.video.parentNode.removeChild(this.video)
      
      config.onDestroy && config.onDestroy()
      // 释放内存
      this.config = null
      this.container = null
      this.video = null
      this.animationId = null
    } catch (e) {}
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