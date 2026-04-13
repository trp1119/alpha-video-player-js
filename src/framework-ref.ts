import type { IAlphaVideoPlayer } from './index'

/**
 * Vue 2 / Vue 3 的 template ref、React 的 `useRef` 所指向的命令式 API 形状（与 `expose` / `useImperativeHandle` 一致）。
 */
export type IAlphaVideoPlayerRef = {
  play: () => Promise<void> | undefined
  pause: () => void
  destroy: () => void
  reset: () => void
  setSrc: (src: string) => void
  setCurrentTime: (time: number) => void
  setMute: (muted: boolean) => void
  setLoop: (loop: boolean) => void
  setPlaybackRate: (rate: number) => void
  getPlayer: () => IAlphaVideoPlayer | null
}
