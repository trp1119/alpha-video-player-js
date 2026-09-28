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
| `updateConfig(config)` | Applies runtime options. Layout/render-mode changes rebuild internal resources while preserving the public player instance. |
| `pause()` | Pauses playback and stops the frame loop. |
| `reset()` | Resets playback progress. |
| `setSrc(src)` | Changes the video source. |
| `setCurrentTime(seconds)` | Seeks to a time in seconds. |
| `setMute(muted)` | Changes mute state. |
| `setLoop(loop)` | Changes loop state. |
| `setPlaybackRate(rate)` | Changes playback speed. |
| `destroy()` | Releases DOM, canvas, and rendering resources. Do not reuse the instance afterward. |

`updateConfig()` incrementally overlays the supplied fields on the current configuration. Media options, transparent layout coordinates, output dimensions, `fps`, and `videoFrame` update in place; switching between positive `alphaScale` values reuses the same video, canvas, and WebGL context. Native-video source changes, `crossOrigin` changes, and switches between `alphaScale=0` and a positive value use a double-buffered transition: the old output remains visible while the replacement loads off-flow and hidden, then the SDK swaps outputs only after the replacement is playable and its first frame is ready. Active playback resumes automatically. If replacement loading fails, the previous renderer is restored. Internal transitions do not emit `onDestroy`; that callback remains reserved for destroying the public player.

When the player is paused with `autoShow=false`, a prepared replacement stays hidden and the previous frame remains visible until the next `play()` call activates it.

```ts
player.updateConfig({
  src: nextVideo.src,
  alphaScale: nextVideo.alphaScale,
  orientation: nextVideo.orientation,
  side: nextVideo.side,
  alphaAlign: nextVideo.alphaAlign,
})

await player.play()
```

`play()` rejects with the browser's original error (for example, a `DOMException` from autoplay restrictions). The current play request also invokes `onError` with that value; requests superseded by pause, source changes, destruction, or a newer play request do not deliver stale error callbacks. Media load/decode failures and frame-rendering errors are delivered through `onError` and then destroy the instance.

### Operational errors and monitoring

Incorrect call timing uses `AlphaVideoPlayerError` with a stable `code` and the attempted `action`:

| Code | Meaning |
| --- | --- |
| `VIDEO_SOURCE_MISSING` | The operation needs a video, but no `src` has been set yet. |
| `PLAYER_DESTROYED` | The public player or its renderer has already been destroyed and cannot be reused. |
| `PLAYER_NOT_INITIALIZED` | Renderer initialization failed; inspect the earlier `onInitError` value. |

These operational errors do **not** invoke the player's `onError` callback. Synchronous methods can be handled with `try/catch`; because `play()` is asynchronous, it must be awaited or given a rejection handler:

```ts
import { isAlphaVideoPlayerError } from 'alpha-video-player-js'

try {
  player.setMute(true)
  await player.play()
} catch (error) {
  if (isAlphaVideoPlayerError(error)) {
    if (error.code === 'VIDEO_SOURCE_MISSING') return
    if (error.code === 'PLAYER_DESTROYED') return
  }
  throw error
}
```

A handled exception/rejection does not reach the browser's global `error` / `unhandledrejection` hooks, so normal global monitoring will not report it. A monitoring SDK explicitly configured to capture handled exceptions may still record it; filter `AlphaVideoPlayerError` by `code` in that SDK's `beforeSend` hook. Browser playback, media decoding, CORS, and frame-rendering failures are different: they still invoke `onError`, and catching the returned `play()` promise does not cancel reporting performed inside your own `onError` callback.

### Multiple players on one page

Create each player with its own container (or mount separate framework components). Video elements, callbacks, render resources, and frame loops belong to their instances. Pausing or destroying one player does not stop another. Repeated `play()` calls maintain one frame loop; `pause()`, `setSrc()`, and `destroy()` invalidate pending playback starts. Call `play()` again after changing the source when playback is desired.

Each WebGL player allocates one context on its output canvas. If WebGL returns no context, the same canvas is used for Canvas 2D. A `webglcontextlost` event is forwarded to `onError`, after which the affected player is destroyed; it does not automatically restore or switch renderers mid-playback. Remount the component or create a new core instance to retry. Initialization failures clean up partial resources before invoking `onInitError` (or throwing if no handler is provided).

`destroy()` is idempotent and calls `onDestroy` only after resource cleanup. Browser GPU-context and video-decoder limits still apply: pause offscreen effects, destroy unused instances, and measure concurrency on target devices. The SDK does not impose or guarantee a universal instance limit.

## Framework components

All component packages expose the same player options except `container`, which the component owns. Runtime prop changes are forwarded through `updateConfig()`, including layout and render-mode changes. Their refs expose `play`, `updateConfig`, `pause`, `destroy`, `reset`, `setSrc`, `setCurrentTime`, `setMute`, `setLoop`, `setPlaybackRate`, and `getPlayer`.

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

The React component also accepts `className` and `style`. Media, size, and packing props synchronize reactively; switching `alphaScale` among native and transparent modes does not require remounting.

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
npm test       # Build, then run lifecycle regressions (Node.js 18+)
```

## License

[ISC](./package.json)
