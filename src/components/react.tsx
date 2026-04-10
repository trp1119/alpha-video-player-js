import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import Render from '../index'
import type { IOrientation, ISide } from '../type'

export interface AlphaVideoPlayerProps {
  src?: string
  width?: number
  height?: number
  crossOrigin?: 'anonymous' | 'use-credentials'
  muted?: boolean
  loop?: boolean
  playbackRate?: number
  fps?: number
  orientation?: IOrientation
  side?: ISide
  videoFrame?: boolean
  debug?: boolean
  autoShow?: boolean
  autoClear?: boolean
  autoDestroy?: boolean
  autoResize?: 'width' | 'height' | 'contain' | false
  onInitSuccess?: () => void
  onInitError?: (e: ErrorEvent) => void
  onLoad?: () => void
  onCanPlay?: () => void
  onPlay?: () => void
  onLoop?: () => void
  onPause?: () => void
  onEnded?: () => void
  onError?: (e: unknown) => void
  onDestroy?: () => void
  className?: string
  style?: React.CSSProperties
}

export interface AlphaVideoPlayerRef {
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

const AlphaVideoPlayer = forwardRef<AlphaVideoPlayerRef, AlphaVideoPlayerProps>(
  (props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<Render | null>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
      if (!containerRef.current) return
      const p = propsRef.current

      playerRef.current = new Render({
        container: containerRef.current,
        src: p.src,
        width: p.width,
        height: p.height,
        crossOrigin: p.crossOrigin,
        muted: p.muted ?? true,
        loop: p.loop ?? false,
        playbackRate: p.playbackRate ?? 1,
        fps: p.fps,
        orientation: p.orientation,
        side: p.side,
        videoFrame: p.videoFrame,
        debug: p.debug,
        autoShow: p.autoShow,
        autoClear: p.autoClear,
        autoDestroy: p.autoDestroy,
        autoResize: p.autoResize,
        onInitSuccess: () => propsRef.current.onInitSuccess?.(),
        onInitError: (e) => propsRef.current.onInitError?.(e),
        onLoad: () => propsRef.current.onLoad?.(),
        onCanPlay: () => propsRef.current.onCanPlay?.(),
        onPlay: () => propsRef.current.onPlay?.(),
        onLoop: () => propsRef.current.onLoop?.(),
        onPause: () => propsRef.current.onPause?.(),
        onEnded: () => propsRef.current.onEnded?.(),
        onError: (e) => propsRef.current.onError?.(e),
        onDestroy: () => propsRef.current.onDestroy?.(),
      })

      return () => {
        playerRef.current?.destroy()
        playerRef.current = null
      }
    }, [])

    useEffect(() => {
      if (props.src != null) playerRef.current?.setSrc(props.src)
    }, [props.src])

    useEffect(() => {
      playerRef.current?.setMute(props.muted ?? true)
    }, [props.muted])

    useEffect(() => {
      playerRef.current?.setLoop(props.loop ?? false)
    }, [props.loop])

    useEffect(() => {
      playerRef.current?.setPlaybackRate(props.playbackRate ?? 1)
    }, [props.playbackRate])

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      destroy: () => {
        playerRef.current?.destroy()
        playerRef.current = null
      },
      reset: () => playerRef.current?.reset(),
      setSrc: (src: string) => playerRef.current?.setSrc(src),
      setCurrentTime: (time: number) => playerRef.current?.setCurrentTime(time),
      setMute: (muted: boolean) => playerRef.current?.setMute(muted),
      setLoop: (loop: boolean) => playerRef.current?.setLoop(loop),
      setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate(rate),
      getPlayer: () => playerRef.current,
    }))

    return <div ref={containerRef} className={props.className} style={props.style} />
  },
)

AlphaVideoPlayer.displayName = 'AlphaVideoPlayer'

export default AlphaVideoPlayer
