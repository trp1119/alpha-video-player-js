/**
 * Vue 2.7+ 组件。
 *
 * 开发时 devDependencies 通过 `"vue2": "npm:vue@^2.7"` 别名安装，
 * 构建时 rollup alias 将 'vue2' → 'vue'，最终产物 import 的是 'vue'。
 *
 * 使用 `as any` 断言绕开 TS 对 vue@3 类型下 Options API 的不兼容。
 */
// @ts-ignore — vue2 别名，构建时替换为 'vue'
import Vue2 from 'vue2'
import Render from '../index'
import type { IOrientation, ISide } from '../type'

const AlphaVideoPlayer = (Vue2 as any).extend({
  name: 'AlphaVideoPlayer',
  props: {
    src: { type: String, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    crossOrigin: { type: String, default: undefined },
    muted: { type: Boolean, default: true },
    loop: { type: Boolean, default: false },
    playbackRate: { type: Number, default: 1 },
    fps: { type: Number, default: 0 },
    orientation: { type: String, default: 'landscape' },
    side: { type: String, default: 'front' },
    videoFrame: { type: Boolean, default: false },
    debug: { type: Boolean, default: false },
    autoShow: { type: Boolean, default: false },
    autoClear: { type: Boolean, default: true },
    autoDestroy: { type: Boolean, default: false },
    autoResize: { default: 'contain' },
  },
  data() {
    return { _player: null as Render | null }
  },
  render(h: any) {
    return h('div', { ref: 'container' })
  },
  mounted() {
    this._initPlayer()
  },
  beforeDestroy() {
    this._destroyPlayer()
  },
  watch: {
    src(v: string) { if (v != null) (this as any)._player?.setSrc(v) },
    muted(v: boolean) { (this as any)._player?.setMute(v) },
    loop(v: boolean) { (this as any)._player?.setLoop(v) },
    playbackRate(v: number) { (this as any)._player?.setPlaybackRate(v) },
  },
  methods: {
    _initPlayer() {
      const self = this as any
      const el = self.$refs.container as HTMLElement
      if (!el) return
      self._destroyPlayer()
      self._player = new Render({
        container: el,
        src: self.src,
        width: self.width,
        height: self.height,
        crossOrigin: self.crossOrigin,
        muted: self.muted,
        loop: self.loop,
        playbackRate: self.playbackRate,
        fps: self.fps,
        orientation: self.orientation as IOrientation,
        side: self.side as ISide,
        videoFrame: self.videoFrame,
        debug: self.debug,
        autoShow: self.autoShow,
        autoClear: self.autoClear,
        autoDestroy: self.autoDestroy,
        autoResize: self.autoResize,
        onInitSuccess: () => self.$emit('init-success'),
        onInitError: (e: any) => self.$emit('init-error', e),
        onLoad: () => self.$emit('load'),
        onCanPlay: () => self.$emit('can-play'),
        onPlay: () => self.$emit('play'),
        onLoop: () => self.$emit('loop'),
        onPause: () => self.$emit('pause'),
        onEnded: () => self.$emit('ended'),
        onError: (e: any) => self.$emit('error', e),
        onDestroy: () => self.$emit('destroy'),
      })
    },
    play() { return (this as any)._player?.play() },
    pause() { (this as any)._player?.pause() },
    reset() { (this as any)._player?.reset() },
    _destroyPlayer() {
      const self = this as any
      if (!self._player) return
      self._player.destroy()
      self._player = null
    },
    destroy() { (this as any)._destroyPlayer() },
    setSrc(src: string) { (this as any)._player?.setSrc(src) },
    setCurrentTime(time: number) { (this as any)._player?.setCurrentTime(time) },
    setMute(muted: boolean) { (this as any)._player?.setMute(muted) },
    setLoop(loop: boolean) { (this as any)._player?.setLoop(loop) },
    setPlaybackRate(rate: number) { (this as any)._player?.setPlaybackRate(rate) },
    getPlayer(): Render | null { return (this as any)._player },
  },
})

export default AlphaVideoPlayer
