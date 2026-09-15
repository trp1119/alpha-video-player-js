import type { IConfig } from '../type'
import Video from './video'

/**
 * 普通不透明视频直接使用原生 video，避免创建 canvas 和逐帧纹理上传。
 */
export default class NativeVideoRender extends Video {
  constructor (config: IConfig) {
    super(config, true)
  }

  protected onEnded () {
    const { config } = this
    config.autoClear && this.setNativeVideoVisible(false)
    super.onEnded()
  }
}
