# alpha-video-player-js（中文文档）

[English](./README.md) · [在线演示](https://trp1119.github.io/alpha-video-player-js-demo)

`alpha-video-player-js` 是零运行时依赖的 Web 透明视频播放 SDK。它把同一 MP4 帧内的 RGB 画面与灰度 Alpha 遮罩重新合成到 `<canvas>`，用于播放高还原度的透明视频动效。

## 特性

- 优先使用 WebGL，Canvas 2D 自动降级。
- `alphaScale: 0` 时自动使用原生 `<video>` 播放普通不透明视频。
- 支持横向、纵向、RGB 在前/后四类拼合格式，以及缩放 Alpha 遮罩。
- 提供 Vue 3、Vue 2.7+、React 组件入口。
- 零运行时依赖。

## 安装与快速使用

```bash
npm install alpha-video-player-js
```

```ts
import AlphaVideoPlayer from 'alpha-video-player-js'

const player = new AlphaVideoPlayer({
  container: document.querySelector<HTMLElement>('#player')!,
  src: 'https://example.com/alpha-video.mp4',
  width: 320,
  height: 180,
  muted: true,
  loop: true,
  autoShow: true,
})

await player.play()
```

未传 `width` / `height` 时，容器必须有可计算的尺寸。浏览器自动播放策略可能拒绝 `play()`，请处理其 Promise 拒绝。

## 素材格式

每帧视频由 RGB 区和 Alpha 区组成：RGB 区为彩色画面，Alpha 区为灰度遮罩，其 R 通道被用作输出透明度（白色不透明，黑色透明）。

| `orientation` | `side: 'front'` | `side: 'back'` |
| --- | --- | --- |
| `landscape` | RGB 在左，Alpha 在右 | Alpha 在左，RGB 在右 |
| `portrait` | RGB 在上，Alpha 在下 | Alpha 在上，RGB 在下 |

`alphaScale` 表示 Alpha 遮罩相对 RGB 的宽高缩放：`1` 为等尺寸（默认），`0.5` 为宽高各一半，`0` 表示普通不透明视频。缩小遮罩可由 `alphaAlign` 对齐：横向布局的 `start/end` 分别为上/下；纵向布局分别为左/右。

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

## 核心配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `container` | — | **必填**，挂载容器。 |
| `src` | — | 视频地址；可稍后用 `setSrc()` 设置。 |
| `poster` | 透明封面 | 视频封面。 |
| `width` / `height` | 容器尺寸 | 逻辑渲染尺寸。 |
| `crossOrigin` | `'anonymous'` | `'anonymous'` 或 `'use-credentials'`。 |
| `muted` / `loop` / `playbackRate` | `true` / `false` / `1` | 播放状态与倍速。 |
| `fps` / `videoFrame` | `0` / `false` | 帧率上限；是否优先用 `requestVideoFrameCallback`。 |
| `orientation` / `side` | `'landscape'` / `'front'` | 素材拼合方式。 |
| `alphaScale` / `alphaAlign` | `1` / `'start'` | 遮罩缩放与副轴对齐。 |
| `autoShow` / `autoClear` / `autoDestroy` | `false` / `true` / `false` | 首帧、结束清理、自动销毁。 |
| `autoResize` | `'contain'` | `'contain'`、`'width'`、`'height'` 或 `false`。 |
| `debug` | `false` | 是否输出调试日志。 |

回调：`onInitSuccess`、`onInitError`、`onLoad`、`onCanPlay`、`onPlay`、`onLoop`、`onPause`、`onEnded`、`onError`、`onDestroy`。

## 实例 API

`playing` 与 `loop` 为只读状态；其余公开方法包括：

```ts
player.play(config?)
player.pause()
player.reset()
player.setSrc(src)
player.setCurrentTime(seconds)
player.setMute(muted)
player.setLoop(loop)
player.setPlaybackRate(rate)
player.destroy()
```

`play()` 失败时会 reject 浏览器的原始错误，并以相同值调用 `onError`。媒体加载、解码或跨域失败也会通过 `onError` 上报，然后销毁实例。`destroy()` 后不要复用该实例。

## 框架组件

组件入口分别为 `alpha-video-player-js/vue3`、`alpha-video-player-js/vue2` 和 `alpha-video-player-js/react`。组件接收除 `container` 外的全部核心配置，ref 暴露 `play`、`pause`、`destroy`、`reset`、`setSrc`、`setCurrentTime`、`setMute`、`setLoop`、`setPlaybackRate` 与 `getPlayer`。

### Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue'
import AlphaVideoPlayer from 'alpha-video-player-js/vue3'
import type { IAlphaVideoPlayerRef } from 'alpha-video-player-js/vue3'

const player = ref<IAlphaVideoPlayerRef | null>(null)
</script>

<template>
  <AlphaVideoPlayer ref="player" :src="src" :muted="true" @initSuccess="player?.play()" />
</template>
```

`playbackRate` 等数字型表单绑定请用 `v-model.number`。手动调用组件 ref 的 `destroy()` 后，应通过 `:key` 或 `v-if` 重新挂载组件。

### React

```tsx
import { useRef } from 'react'
import AlphaVideoPlayer from 'alpha-video-player-js/react'
import type { IAlphaVideoPlayerRef } from 'alpha-video-player-js/react'

export function Effect({ src }: { src: string }) {
  const player = useRef<IAlphaVideoPlayerRef>(null)
  return <AlphaVideoPlayer ref={player} src={src} muted onInitSuccess={() => player.current?.play()} />
}
```

React 组件额外支持 `className` 与 `style`。`src`、`muted`、`loop`、`playbackRate` 会响应式同步；`orientation`、`side`、`alphaScale`、`alphaAlign` 变更时需要重新挂载。

## 类型导入

| 导入路径 | 类型 |
| --- | --- |
| `alpha-video-player-js` | `IAlphaVideoPlayer`、`IConfig`、`IOptionalConfig`、`IOrientation`、`ISide`、`IAlphaAlign` |
| `.../vue3`、`.../vue2` | `IAlphaVideoPlayer`、`IAlphaVideoPlayerRef` |
| `.../react` | `IAlphaVideoPlayerProps`、`IAlphaVideoPlayerRef` |

同时使用框架 ref 与核心实例类型时，请从同一个框架子路径导入，避免生成声明文件被拆分解析时的类型不兼容。

## 开发

```bash
npm run dev
npm run build
```

## 许可证

[ISC](./package.json)
