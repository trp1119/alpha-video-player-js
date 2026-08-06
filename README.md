# alpha-video-player-js

[中文文档](./README.zh-CN.md) · [Demo](https://trp1119.github.io/alpha-video-player-js-demo)

`alpha-video-player-js` is a zero-dependency web SDK for playing videos with transparency. It rebuilds an alpha video frame on a `<canvas>` by combining its RGB image with a grayscale alpha mask. Use it for high-fidelity motion effects that are more complex than APNG or Lottie.

## Highlights

- WebGL rendering with a Canvas 2D fallback.
- Native `<video>` playback for regular, opaque videos.
- Supports horizontal and vertical RGB/alpha layouts, including reversed layouts.
- Supports scaled alpha masks and alignment on the secondary axis.
- Framework components for Vue 3, Vue 2.7+, and React.
- No runtime dependencies; framework packages are optional peer dependencies.

## Installation

```bash
npm install alpha-video-player-js
```

## Quick start

The container needs an explicit size when `width` and `height` are not supplied.

```ts
import AlphaVideoPlayer from 'alpha-video-player-js'

const container = document.querySelector<HTMLElement>('#player')!

const player = new AlphaVideoPlayer({
  container,
  src: 'https://example.com/alpha-video.mp4',
  width: 320,
  height: 180,
  muted: true,
  loop: true,
  autoShow: true,
})

await player.play()
```

For autoplay, keep the video muted and handle the rejected `play()` promise; browsers may still enforce autoplay policies.

## Alpha video format

An alpha video stores two images in each ordinary MP4 frame:

- **RGB region**: the visible color image.
- **Alpha region**: a grayscale mask. Its red channel becomes the output alpha (`white = opaque`, `black = transparent`).

`orientation` determines how the regions are packed and `side` determines where the RGB region is located:

| `orientation` | `side: 'front'` | `side: 'back'` |
| --- | --- | --- |
| `landscape` | RGB left, alpha right | Alpha left, RGB right |
| `portrait` | RGB top, alpha bottom | Alpha top, RGB bottom |

### Scaled alpha masks

`alphaScale` is the alpha mask's width and height relative to the RGB image:

```text
1   equal-size RGB and alpha regions (default)
0.5 alpha is half the RGB width and half the RGB height
0   no alpha mask; play the source as a native opaque video
```

When `alphaScale < 1`, use `alphaAlign` to locate the mask on the secondary axis: `start` means top for `landscape` / left for `portrait`; `end` means bottom / right.

```ts
new AlphaVideoPlayer({
  container,
  src,
  orientation: 'landscape',
  side: 'front',
  alphaScale: 0.5,
  alphaAlign: 'start',
})
```

## Core API

### Configuration

| Option | Type / default | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | **Required.** Mount target. |
| `src` | `string` | Video URL. Optional at construction; call `setSrc()` later. |
| `poster` | `string` | Poster image. A transparent fallback is used by default. |
| `width`, `height` | `number` | Logical render size; defaults to container dimensions. |
| `crossOrigin` | `'anonymous'` | CORS mode: `'anonymous'` or `'use-credentials'`. |
| `muted` | `true` | Whether the video is muted. |
| `loop` | `false` | Loop playback. |
| `playbackRate` | `1` | Playback speed. |
| `fps` | `0` | Animation-frame cap; `0` means uncapped. |
| `videoFrame` | `false` | Prefer `requestVideoFrameCallback` when supported. |
| `orientation` | `'landscape'` | Alpha-video packing direction. |
| `side` | `'front'` | RGB region position. |
| `alphaScale` | `1` | Alpha mask scale from `0` to `1`; `0` uses native video. |
| `alphaAlign` | `'start'` | Scaled mask alignment: `'start'` or `'end'`. |
| `autoShow` | `false` | Draw the first frame once playable. |
| `autoClear` | `true` | Clear the canvas when playback ends. |
| `autoDestroy` | `false` | Destroy the player when playback ends. |
| `autoResize` | `'contain'` | Resize mode: `'contain'`, `'width'`, `'height'`, or `false`. |
| `debug` | `false` | Print debug output. |

Callbacks: `onInitSuccess`, `onInitError`, `onLoad`, `onCanPlay`, `onPlay`, `onLoop`, `onPause`, `onEnded`, `onError`, and `onDestroy`.

### Instance methods and properties

| Member | Description |
| --- | --- |
| `playing` | Read-only boolean that reports whether playback is active. |
| `loop` | Read-only boolean that reports loop state. |
| `play(config?)` | Starts or resumes playback and returns a `Promise`. The optional config overrides applicable settings. |
| `pause()` | Pauses playback and stops the frame loop. |
| `reset()` | Resets playback progress. |
| `setSrc(src)` | Changes the video source. |
| `setCurrentTime(seconds)` | Seeks to a time in seconds. |
| `setMute(muted)` | Changes mute state. |
| `setLoop(loop)` | Changes loop state. |
| `setPlaybackRate(rate)` | Changes playback speed. |
| `destroy()` | Releases DOM, canvas, and rendering resources. Do not reuse the instance afterward. |

`play()` rejects with the browser's original error (for example, a `DOMException` from autoplay restrictions) and also invokes `onError` with that same value. Media load/decode failures are delivered through `onError` and then destroy the instance.

## Framework components

All component packages expose the same player options except `container`, which the component owns. Their refs expose `play`, `pause`, `destroy`, `reset`, `setSrc`, `setCurrentTime`, `setMute`, `setLoop`, `setPlaybackRate`, and `getPlayer`.

### Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue'
import AlphaVideoPlayer from 'alpha-video-player-js/vue3'
import type { IAlphaVideoPlayerRef } from 'alpha-video-player-js/vue3'

const player = ref<IAlphaVideoPlayerRef | null>(null)
</script>

<template>
  <div style="width: 320px; height: 180px">
    <AlphaVideoPlayer
      ref="player"
      src="https://example.com/alpha-video.mp4"
      :width="320"
      :height="180"
      :muted="true"
      :loop="true"
      @initSuccess="player?.play()"
    />
  </div>
</template>
```

Use `v-model.number` for numeric form controls such as `playbackRate`; native range inputs otherwise produce strings. After calling a component ref's `destroy()`, remount the component (for example, change its `:key`) to create a new player.

### Vue 2.7+

```vue
<template>
  <AlphaVideoPlayer
    ref="player"
    :src="src"
    :muted="true"
    @init-success="$refs.player.play()"
  />
</template>

<script>
import AlphaVideoPlayer from 'alpha-video-player-js/vue2'

export default { components: { AlphaVideoPlayer } }
</script>
```

### React

```tsx
import { useRef } from 'react'
import AlphaVideoPlayer from 'alpha-video-player-js/react'
import type { IAlphaVideoPlayerRef } from 'alpha-video-player-js/react'

export function Effect() {
  const player = useRef<IAlphaVideoPlayerRef>(null)
  return (
    <AlphaVideoPlayer
      ref={player}
      src="https://example.com/alpha-video.mp4"
      muted
      loop
      onInitSuccess={() => player.current?.play()}
    />
  )
}
```

The React component also accepts `className` and `style`. Components reactively synchronize changes to `src`, `muted`, `loop`, and `playbackRate`; changing packing options (`orientation`, `side`, `alphaScale`, `alphaAlign`) requires remounting.

### TypeScript exports

| Import path | Types |
| --- | --- |
| `alpha-video-player-js` | `IAlphaVideoPlayer`, `IConfig`, `IOptionalConfig`, `IOrientation`, `ISide`, `IAlphaAlign` |
| `alpha-video-player-js/vue3`, `.../vue2` | `IAlphaVideoPlayer`, `IAlphaVideoPlayerRef` |
| `alpha-video-player-js/react` | `IAlphaVideoPlayerProps`, `IAlphaVideoPlayerRef` |

If you need both a framework ref and the core instance type, import them from the same framework subpath. This avoids incompatibility when tooling resolves separate generated declarations.

## Development

```bash
npm run dev    # Watch with Rollup
npm run build  # Production bundles and declarations
```

## License

[ISC](./package.json)
