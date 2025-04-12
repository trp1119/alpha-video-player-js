import WebGLRender from './renderer/webgl-render'
import CanvasRender from './renderer/canvas-render'
import { supportCanvas2d, supportWebGL } from './util'
import type { IConfig, IOptionalConfig } from './type'

export type { IConfig }

export default class Render {
  private render: WebGLRender | CanvasRender
  constructor (config: IConfig) {
    if (supportWebGL()) {
      this.render = new WebGLRender(config)
    } else if (supportCanvas2d()) {
      this.render = new CanvasRender(config)
    } else {
      throw new Error('[alpha-video-player-js]: Your browser does not support play. Please upgrade your browser and try again.')
    }
  }

  get playing () {
    return this.render.playing
  }

  get loop () {
    return this.render.loop
  }

  public play (config?: IOptionalConfig) {
    this.render.play(config)
  }
  

  public pause () {
    this.render.pause()
  }

  public destroy () {
    this.render.destroy()
  }

  public reset () {
    this.render.reset()
  }

  public setSrc (src: string) {
    this.render.setSrc(src)
  }

  public setCurrentTime(time: number) {
    this.render.setCurrentTime(time)
  }

  public setMute (muted: boolean) {
    this.render.setMute(muted)
  }

  public setLoop (loop: boolean) {
    this.render.setLoop(loop)
  }

  public setPlaybackRate (playbackRate: number) {
    this.render.setPlaybackRate(playbackRate)
  }
}
