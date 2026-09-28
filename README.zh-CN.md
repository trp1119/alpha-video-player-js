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
player.updateConfig(config)
player.pause()
player.reset()
player.setSrc(src)
player.setCurrentTime(seconds)
player.setMute(muted)
player.setLoop(loop)
player.setPlaybackRate(rate)
player.destroy()
```

`updateConfig()` 会把传入字段增量覆盖到当前配置。媒体属性、透明布局坐标、输出尺寸、`fps` 和 `videoFrame` 均原地更新；正数 `alphaScale` 之间切换会复用同一个 video、Canvas 和 WebGL 上下文。普通视频换源、`crossOrigin` 变化以及 `alphaScale=0` 与正数之间切换时使用双缓冲：旧输出保持可见，新 renderer 在脱离文档流的隐藏状态下加载，确认可播放并准备好首帧后再原子替换；切换前正在播放时会自动续播。新资源加载失败则恢复旧 renderer。内部切换不会触发 `onDestroy`，`onDestroy` 仍只表示公共播放器被真正销毁。

播放器暂停且 `autoShow=false` 时，新 renderer 准备完成后仍保持隐藏，旧画面会保留到下一次调用 `play()` 再完成替换。

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

`play()` 失败时会 reject 浏览器的原始错误，当前有效请求还会以相同值调用 `onError`。被暂停、换源、销毁或后续播放请求取代的旧请求不再触发过期错误回调。媒体加载、解码、跨域或逐帧渲染失败会通过 `onError` 上报，然后销毁实例。`destroy()` 后不要复用该实例。

### 可识别错误与监控过滤

调用时机不正确时会抛出 `AlphaVideoPlayerError`，其中包含稳定的 `code` 和本次操作 `action`：

| 错误码 | 真实原因 |
| --- | --- |
| `VIDEO_SOURCE_MISSING` | 当前还没有设置 `src`，但调用的方法需要 video。 |
| `PLAYER_DESTROYED` | 公共播放器或底层 renderer 已销毁，实例不能继续复用。 |
| `PLAYER_NOT_INITIALIZED` | renderer 初始化失败，应查看更早的 `onInitError`。 |

这些播放器状态错误不会调用配置中的 `onError`。同步方法可以直接 `try/catch`；`play()` 是异步方法，必须配合 `await`，或显式调用 `.catch()`：

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

被正确捕获的异常或 Promise rejection 不会进入浏览器全局 `error` / `unhandledrejection`，常规全局监控不会上报。但如果监控 SDK 被配置为采集“已捕获异常”，仍可能记录；可在其 `beforeSend` 等过滤入口按 `AlphaVideoPlayerError.code` 忽略。浏览器播放失败、媒体解码、CORS 和逐帧渲染失败仍会调用 `onError`；业务即使捕获了 `play()` 的 rejection，也不会撤销自己在 `onError` 中执行的监控上报。

### 同页多实例

每个播放器使用独立容器，或分别挂载框架组件。video、事件、渲染资源和帧循环均归各自实例所有，暂停或销毁一个不会停止另一个。重复调用 `play()` 只保留一个帧循环；`pause()`、`setSrc()`、`destroy()` 会使尚未完成的播放启动请求失效。换源后如需播放，重新调用 `play()`。

每个 WebGL 播放器只在输出画布上申请一个上下文。WebGL 返回空上下文时，同一画布回退到 Canvas 2D。浏览器触发 `webglcontextlost` 时，SDK 通过 `onError` 传出该事件并销毁受影响的实例，不在播放中自动恢复或切换渲染器；需要重试时重新创建实例或挂载组件。初始化失败会先清理部分资源，再调用 `onInitError`；未提供回调时抛出异常。

`destroy()` 可重复调用，`onDestroy` 只在资源清理完成后执行一次。浏览器的 GPU 上下文和视频解码器仍有设备相关限制，建议暂停不可见动效、销毁不用的实例，并在目标设备验证并发量。SDK 不设定或保证统一的最大实例数量。

实现问题与验证边界见[多实例隐患分析与修复记录](./docs/multi-instance-lifecycle.md)。

## 框架组件

组件入口分别为 `alpha-video-player-js/vue3`、`alpha-video-player-js/vue2` 和 `alpha-video-player-js/react`。组件接收除 `container` 外的全部核心配置，运行时 props 变化会通过 `updateConfig()` 自动同步，包括布局与渲染模式切换。ref 暴露 `play`、`updateConfig`、`pause`、`destroy`、`reset`、`setSrc`、`setCurrentTime`、`setMute`、`setLoop`、`setPlaybackRate` 与 `getPlayer`。

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

React 组件额外支持 `className` 与 `style`。媒体、尺寸和布局 props 都会响应式同步；`alphaScale` 在 `0`、`0.5`、`1` 等模式之间变化时不需要重新挂载组件。

## 类型导入

| 导入路径 | 类型 |
| --- | --- |
| `alpha-video-player-js` | `AlphaVideoPlayerError`、`isAlphaVideoPlayerError`、`IAlphaVideoPlayerErrorCode`、`IAlphaVideoPlayer`、`IConfig`、`IOptionalConfig`、`IUpdateConfig`、`IOrientation`、`ISide`、`IAlphaAlign` |
| `.../vue3`、`.../vue2` | 上述错误导出，以及 `IAlphaVideoPlayer`、`IAlphaVideoPlayerRef`、`IUpdateConfig` |
| `.../react` | 上述错误导出，以及 `IAlphaVideoPlayerProps`、`IAlphaVideoPlayerRef`、`IUpdateConfig` |

同时使用框架 ref 与核心实例类型时，请从同一个框架子路径导入，避免生成声明文件被拆分解析时的类型不兼容。

## 开发

```bash
npm run dev
npm run build
npm test       # 先构建再运行生命周期回归（Node.js 18+）
```

## 许可证

[ISC](./package.json)
