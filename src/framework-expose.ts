import type Render from './index'

/**
 * Vue 2 / Vue 3 组件通过 ref（或 Vue 3 的 expose）可调用的方法与内核实例。
 * 与 `alpha-video-player-js/react` 导出的 `AlphaVideoPlayerRef` 字段一致。
 */
export type AlphaVideoPlayerExpose = {
  play: () => Promise<void> | undefined
  pause: () => void
  destroy: () => void
  reset: () => void
  setSrc: (src: string) => void
  setCurrentTime: (time: number) => void
  setMute: (muted: boolean) => void
  setLoop: (loop: boolean) => void
  setPlaybackRate: (rate: number) => void
  getPlayer: () => Render | null
}
