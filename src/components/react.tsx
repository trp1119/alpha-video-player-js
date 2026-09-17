import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import Render from '../index'
import { DEFAULT_ALPHA_ALIGN, DEFAULT_ALPHA_SCALE } from '../constants'
import type { IAlphaVideoPlayerRef } from '../framework-ref'
import type { IAlphaAlign, IOrientation, ISide, IUpdateConfig } from '../type'

export interface IAlphaVideoPlayerProps {
  src?: string
  poster?: string
  width?: number
  height?: number
  crossOrigin?: 'anonymous' | 'use-credentials'
  muted?: boolean
  loop?: boolean
  playbackRate?: number
  fps?: number
  orientation?: IOrientation
  side?: ISide
  alphaScale?: number
  alphaAlign?: IAlphaAlign
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

const AlphaVideoPlayer = forwardRef<IAlphaVideoPlayerRef, IAlphaVideoPlayerProps>(
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
        poster: p.poster,
        width: p.width,
        height: p.height,
        crossOrigin: p.crossOrigin,
        muted: p.muted ?? true,
        loop: p.loop ?? false,
        playbackRate: p.playbackRate ?? 1,
        fps: p.fps,
        orientation: p.orientation ?? 'landscape',
        side: p.side ?? 'front',
        alphaScale: p.alphaScale ?? DEFAULT_ALPHA_SCALE,
        alphaAlign: p.alphaAlign ?? DEFAULT_ALPHA_ALIGN,
        videoFrame: p.videoFrame ?? false,
        debug: p.debug ?? false,
        autoShow: p.autoShow ?? false,
        autoClear: p.autoClear ?? true,
        autoDestroy: p.autoDestroy ?? false,
        autoResize: p.autoResize ?? 'contain',
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
      const p = propsRef.current
      const config: IUpdateConfig = {
        ...(p.src != null ? { src: p.src } : {}),
        poster: p.poster,
        width: p.width,
        height: p.height,
        crossOrigin: p.crossOrigin,
        muted: p.muted ?? true,
        loop: p.loop ?? false,
        playbackRate: p.playbackRate ?? 1,
        fps: p.fps,
        orientation: p.orientation ?? 'landscape',
        side: p.side ?? 'front',
        alphaScale: p.alphaScale ?? DEFAULT_ALPHA_SCALE,
        alphaAlign: p.alphaAlign ?? DEFAULT_ALPHA_ALIGN,
        videoFrame: p.videoFrame ?? false,
        debug: p.debug ?? false,
        autoShow: p.autoShow ?? false,
        autoClear: p.autoClear ?? true,
        autoDestroy: p.autoDestroy ?? false,
        autoResize: p.autoResize ?? 'contain',
      }
      playerRef.current?.updateConfig(config)
    }, [
      props.src, props.poster, props.width, props.height, props.crossOrigin,
      props.muted, props.loop, props.playbackRate, props.fps, props.orientation,
      props.side, props.alphaScale, props.alphaAlign, props.videoFrame, props.debug,
      props.autoShow, props.autoClear, props.autoDestroy, props.autoResize,
    ])

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.play(),
      updateConfig: (config: IUpdateConfig) => playerRef.current?.updateConfig(config),
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
