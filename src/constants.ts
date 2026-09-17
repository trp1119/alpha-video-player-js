import type { IAlphaAlign, IConfig } from './type'

// 1 保持原有 RGB / Alpha 等尺寸格式完全兼容。
export const DEFAULT_ALPHA_SCALE = 1

// start 对应横向靠上、纵向靠左，也是新格式示例的默认位置。
export const DEFAULT_ALPHA_ALIGN: IAlphaAlign = 'start'

export const DEFAULT_CONFIG: Omit<IConfig, 'container' | 'src'> = {
  playbackRate: 1,
  muted: true,
  loop: false,
  fps: 0,
  orientation: 'landscape',
  side: 'front',
  alphaScale: DEFAULT_ALPHA_SCALE,
  alphaAlign: DEFAULT_ALPHA_ALIGN,
  autoShow: false,
  autoClear: true,
  autoDestroy: false,
  autoResize: 'contain',
  debug: false,
  videoFrame: false,
}

// 显式 poster 避免 Android WebView 生成不可跨域读取的 android-webview-video-poster 地址。
export const TRANSPARENT_VIDEO_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// HTMLMediaElement.HAVE_CURRENT_DATA，表示当前播放位置已有真实媒体帧。
export const VIDEO_READY_STATE_CURRENT_DATA = 2
