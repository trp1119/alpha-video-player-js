# alpha-video-player-js

## 简介

alpha-video-player-js 是一个 Web 视频动画特效播放 sdk，可以通过制作 Alpha 通道分离的视频素材，在 Web 端通过 WebGL 或 Canvas 重新实现 RGB 通道和 Alpha 通道的融合，从而实现播放带透明通道的视频。

- 零依赖

- 接入体积小（gzip 约 5KB 量级，以构建产物为准）
- 还原度高
- 兼容 WebGL（GPU） 及 Canvas（CPU） 降级，性能优异
- 支持 横向 - RGB 通道视频在前、横向 - RGB 通道视频在后、纵向 - RGB 通道视频在前、纵向 - RGB 通道视频在后 四类视频融合

## 使用

### 安装

```bash
npm i alpha-video-player-js
```

### 创建实例

```ts
import AlphaVideoPlayerJs from 'alpha-video-player-js'

const player = new AlphaVideoPlayerJs(config)
```

### TypeScript 类型

主包与框架子路径会导出下列类型，便于标注 `ref`、`getPlayer()` 返回值等。

**从 v1.2.0 起**：命令式 ref 类型统一为 **`IAlphaVideoPlayerRef`**；React 组件 props 为 **`IAlphaVideoPlayerProps`**（原 `AlphaVideoPlayerExpose` / 无 `I` 前缀的 `AlphaVideoPlayerRef`、`AlphaVideoPlayerProps` 已更名，升级时请全局替换）。

| 包路径 | 导出类型 | 说明 |
|--------|----------|------|
| `alpha-video-player-js` | `IAlphaVideoPlayer` | 核心类实例（`new` 后的类型） |
| | `IConfig`、`IOptionalConfig` | 构造 / `play()` 可选参数 |
| | `IOrientation`、`ISide` | 拼合方向与 RGB 区域位置 |
| `alpha-video-player-js/vue3`、`.../vue2` | `IAlphaVideoPlayer`、`IAlphaVideoPlayerRef` | 核心实例类型与组件 ref；**若同时用到二者，请从同一子路径导入**，避免与主包各有一份 `.d.ts` 时类型不兼容 |
| `alpha-video-player-js/react` | `IAlphaVideoPlayerProps`、`IAlphaVideoPlayerRef` | 组件 props 与 ref |

```ts
import AlphaVideoPlayer from 'alpha-video-player-js/vue3'
import type { IAlphaVideoPlayer, IAlphaVideoPlayerRef } from 'alpha-video-player-js/vue3'

const playerRef = ref<IAlphaVideoPlayerRef | null>(null)

let core: IAlphaVideoPlayer | null = null
const onCanPlay = () => {
  core = playerRef.value?.getPlayer() ?? null
}
```

### 实例参数

| 参数          | 含义                               | 默认值    | 是否必传 |
| ------------- | ---------------------------------- | --------- | -------- |
| container     | dom 容器                           | -         | 是       |
| src           | 播放地址                           | -         | 否（无则仅创建画布，可后续 `setSrc`） |
| width         | 渲染宽度（默认取容器宽度）         | -         | 否       |
| height        | 渲染高度（默认取容器高度）         | -         | 否       |
| crossOrigin   | 跨域视频：`anonymous` \| `use-credentials` | `anonymous` | 否   |
| muted         | 是否静音播放                       | true      | 否       |
| loop          | 是否循环播放                       | false     | 否       |
| playbackRate  | 播放速率                           | 1         | 否       |
| fps           | 限帧（0 表示不额外限帧）           | 0         | 否       |
| videoFrame    | 是否使用 `requestVideoFrameCallback` 驱动帧循环 | false | 否 |
| orientation   | 视频排布方式 `landscape` \| `portrait` | landscape | 否   |
| side          | RGB 通道区域位置 `front` \| `back` | front     | 否       |
| autoShow      | 可播放后自动绘制首帧               | false     | 否       |
| autoClear     | 播放结束后是否清空画布             | true      | 否       |
| autoDestroy   | 播放结束后是否自动销毁实例         | false     | 否       |
| autoResize    | 元数据加载后是否按视频比例调整 canvas：`contain` \| `width` \| `height` \| `false` | `contain` | 否 |
| debug         | 是否在控制台输出调试信息           | false     | 否       |
| onInitSuccess | 初始化成功回调                     | -         | 否       |
| onInitError   | 初始化失败回调                     | -         | 否       |
| onLoad        | 元数据加载完成回调                 | -         | 否       |
| onCanPlay     | 可以播放回调（首次）               | -         | 否       |
| onPlay        | 开始播放回调                       | -         | 否       |
| onLoop        | 循环再次可播放时回调               | -         | 否       |
| onPause       | 暂停播放回调                       | -         | 否       |
| onEnded       | 结束播放回调                       | -         | 否       |
| onError       | 错误回调，参数为 `unknown`（见下「错误处理」） | - | 否 |
| onDestroy     | 销毁实例回调                       | -         | 否       |

### 实例属性

| 属性    | 含义       | 类型    |
| ------- | ---------- | ------- |
| playing | 是否播放中 | Boolean |
| loop    | 是否循环   | Boolean |

### 实例方法

| 方法                          | 含义             | 参数                |
| ----------------------------- | ---------------- | ------------------- |
| play(config?)                 | 播放/继续播放，返回 `Promise`；失败时 reject 原始错误 | 可选，同实例参数的部分字段 |
| pause()                       | 暂停播放         | -                   |
| destroy()                     | 销毁实例         | -                   |
| reset()                       | 重置播放进度     | -                   |
| setSrc(src)                   | 设置播放地址     | 播放地址（string）  |
| setCurrentTime(time)          | 设置播放进度     | 秒（number）        |
| setMute(muted)                | 设置是否静音     | boolean             |
| setLoop(loop)                 | 设置是否循环     | boolean             |
| setPlaybackRate(playbackRate) | 设置播放倍速     | number              |

### 错误处理

- **`play()` 失败**（如自动播放策略拒绝等）：`Promise` 会被 **reject**，reject 的值为浏览器抛出的**原始错误**（常见为 `DOMException`）；同时若配置了 **`onError`**，也会用**同一引用**调用一次。
- **`<video>` 媒体错误**（地址无效、解码失败、跨域等）：通过 **`onError`** 传入（多为 `Event` / `ErrorEvent`），随后实例会 **`destroy()`**。

示例（在创建实例时传入 `onError`）：

```ts
const player = new AlphaVideoPlayerJs({
  container,
  src,
  onError: (err) => {
    console.error(err)
  },
})

try {
  await player.play()
} catch (e) {
  // play 失败时与 onError 为同一 err 引用
  console.error(e)
}
```

## 框架组件

除了 JS 版本外，还提供了 Vue 3、Vue 2（2.7+）、React 的封装组件，通过子路径导入：

### Vue 3

```ts
import AlphaVideoPlayer from 'alpha-video-player-js/vue3'
```

```html
<template>
  <!-- 需要自定义定位/背景时，在外层包一层；组件根节点仅为无 class 的 div -->
  <div class="player-wrap" :style="{ width: '250px', height: '133px' }">
    <AlphaVideoPlayer
      ref="playerRef"
      src="https://example.com/video.mp4"
      :width="250"
      :height="133"
      :muted="true"
      :loop="false"
      :playback-rate="playbackRate"
      orientation="landscape"
      side="front"
      @initSuccess="onReady"
      @error="onError"
    />
  </div>
  <!-- 倍速滑块：须用 v-model.number，否则 range 会得到字符串，与 playbackRate 的 Number 类型不符 -->
  <input v-model.number="playbackRate" type="range" min="0.5" max="2" step="0.5" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AlphaVideoPlayer from 'alpha-video-player-js/vue3'
import type { IAlphaVideoPlayerRef } from 'alpha-video-player-js/vue3'

const playerRef = ref<IAlphaVideoPlayerRef | null>(null)
const playbackRate = ref(1)

const onReady = () => {
  playerRef.value?.play()
}

const onError = (e: unknown) => {
  console.error(e)
}
</script>
```

### Vue 2（2.7+）

```ts
import AlphaVideoPlayer from 'alpha-video-player-js/vue2'
```

```html
<template>
  <AlphaVideoPlayer
    ref="player"
    src="https://example.com/video.mp4"
    :muted="true"
    orientation="landscape"
    side="front"
    @init-success="onReady"
    @error="onError"
  />
</template>

<script>
import AlphaVideoPlayer from 'alpha-video-player-js/vue2'

export default {
  components: { AlphaVideoPlayer },
  methods: {
    onReady() {
      this.$refs.player.play()
    },
    onError(e) {
      console.error(e)
    },
  },
}
</script>
```

### React

```tsx
import { useRef } from 'react'
import AlphaVideoPlayer from 'alpha-video-player-js/react'
import type { IAlphaVideoPlayerRef } from 'alpha-video-player-js/react'

function App() {
  const playerRef = useRef<IAlphaVideoPlayerRef>(null)

  return (
    <AlphaVideoPlayer
      ref={playerRef}
      src="https://example.com/video.mp4"
      muted
      orientation="landscape"
      side="front"
      onInitSuccess={() => playerRef.current?.play()}
      onError={(e) => console.error(e)}
    />
  )
}
```

### 组件说明

- **Props**：与 JS 版的配置项一一对应（去除 `container`，组件内部自动管理）。其中 **`playbackRate` 为 `number`**，在模板里绑定表单控件时勿传入字符串（例如 `<input type="range">` 配合 **`v-model.number`**，或 `:playback-rate="Number(x)"`）。
- **根节点与布局**：组件只渲染一个**无业务 class** 的根 `div`；若需要与业务一致的绝对定位、背景图上的对齐等，请在**外层元素**上写样式，并通过 **`width` / `height` props**（及 `orientation` / `side` 等）控制画布与拼合逻辑。
- **销毁后再次挂载**：调用 ref 上的 `destroy()` 后实例已清空，不会在同一次挂载中自动重新 `init`；需要再次初始化时，可对组件使用 **`:key` 递增**或 **`v-if` 切换**，以重新挂载（演示项目 `alpha-video-player-js-demo` 的 `Item.vue` 即采用 `:key` 方案）。
- **事件/回调**：
  - Vue 3：`@initSuccess`、`@initError`、`@load`、`@canPlay`、`@play`、`@loop`、`@pause`、`@ended`、`@error`、`@destroy`
  - Vue 2：`@init-success`、`@init-error`、`@load`、`@can-play`、`@play`、`@loop`、`@pause`、`@ended`、`@error`、`@destroy`
  - React：`onInitSuccess`、`onInitError`、`onLoad`、`onCanPlay`、`onPlay`、`onLoop`、`onPause`、`onEnded`、`onError`、`onDestroy`
- **实例方法**（通过 ref 调用）：`play()`、`pause()`、`destroy()`、`reset()`、`setSrc()`、`setCurrentTime()`、`setMute()`、`setLoop()`、`setPlaybackRate()`、`getPlayer()`
- **响应式 props**：`src`、`muted`、`loop`、`playbackRate` 变更时自动同步到播放器实例。
- **生命周期**：组件挂载时自动初始化，卸载时自动销毁。
- **peerDependencies**：vue / react / react-dom 均为可选，只需安装你使用的框架。

## 原理

- WebGLRender 使用 webgl texture 获取 video RGB 通道视频 和 Alpha 通道视频纹理，并在 shader 中进行自定义融合
- CanvasRender 使用 canvas2d getImageData 获取 video RGB 通道视频 和 Alpha 通道视频图片元数据，并进行自定义融合

## 示例

https://trp1119.github.io/alpha-video-player-js-demo
