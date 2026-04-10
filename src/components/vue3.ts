import {
  defineComponent,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  h,
  type PropType,
} from 'vue'
import Render from '../index'
import type { IOrientation, ISide } from '../type'

export default defineComponent({
  name: 'AlphaVideoPlayer',
  props: {
    src: { type: String, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    crossOrigin: { type: String as PropType<'anonymous' | 'use-credentials'>, default: undefined },
    muted: { type: Boolean, default: true },
    loop: { type: Boolean, default: false },
    playbackRate: { type: Number, default: 1 },
    fps: { type: Number, default: 0 },
    orientation: { type: String as PropType<IOrientation>, default: 'landscape' },
    side: { type: String as PropType<ISide>, default: 'front' },
    videoFrame: { type: Boolean, default: false },
    debug: { type: Boolean, default: false },
    autoShow: { type: Boolean, default: false },
    autoClear: { type: Boolean, default: true },
    autoDestroy: { type: Boolean, default: false },
    autoResize: {
      type: [String, Boolean] as PropType<'width' | 'height' | 'contain' | false>,
      default: 'contain',
    },
  },
  emits: [
    'initSuccess',
    'initError',
    'load',
    'canPlay',
    'play',
    'loop',
    'pause',
    'ended',
    'error',
    'destroy',
  ],
  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLElement>()
    let player: Render | null = null

    const init = () => {
      if (!containerRef.value) return
      destroy()
      player = new Render({
        container: containerRef.value,
        src: props.src,
        width: props.width,
        height: props.height,
        crossOrigin: props.crossOrigin,
        muted: props.muted,
        loop: props.loop,
        playbackRate: props.playbackRate,
        fps: props.fps,
        orientation: props.orientation,
        side: props.side,
        videoFrame: props.videoFrame,
        debug: props.debug,
        autoShow: props.autoShow,
        autoClear: props.autoClear,
        autoDestroy: props.autoDestroy,
        autoResize: props.autoResize,
        onInitSuccess: () => emit('initSuccess'),
        onInitError: (e) => emit('initError', e),
        onLoad: () => emit('load'),
        onCanPlay: () => emit('canPlay'),
        onPlay: () => emit('play'),
        onLoop: () => emit('loop'),
        onPause: () => emit('pause'),
        onEnded: () => emit('ended'),
        onError: (e) => emit('error', e),
        onDestroy: () => emit('destroy'),
      })
    }

    const play = () => player?.play()
    const pause = () => player?.pause()
    const reset = () => player?.reset()
    const destroy = () => {
      if (!player) return
      player.destroy()
      player = null
    }
    const setSrc = (src: string) => player?.setSrc(src)
    const setCurrentTime = (time: number) => player?.setCurrentTime(time)
    const setMute = (muted: boolean) => player?.setMute(muted)
    const setLoop = (loop: boolean) => player?.setLoop(loop)
    const setPlaybackRate = (rate: number) => player?.setPlaybackRate(rate)

    watch(() => props.src, (v) => v != null && player?.setSrc(v))
    watch(() => props.muted, (v) => player?.setMute(v))
    watch(() => props.loop, (v) => player?.setLoop(v))
    watch(() => props.playbackRate, (v) => player?.setPlaybackRate(v))

    onMounted(init)
    onBeforeUnmount(destroy)

    expose({
      play,
      pause,
      destroy,
      reset,
      setSrc,
      setCurrentTime,
      setMute,
      setLoop,
      setPlaybackRate,
      getPlayer: () => player,
    })

    return () => h('div', { ref: containerRef })
  },
})
