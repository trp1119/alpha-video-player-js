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

## 原理

- WebGLRender 使用 webgl texture 获取 video RGB 通道视频 和 Alpha 通道视频纹理，并在 shader 中进行自定义融合
- CanvasRender 使用 canvas2d getImageData 获取 video RGB 通道视频 和 Alpha 通道视频图片元数据，并进行自定义融合

## 示例

https://trp1119.github.io/alpha-video-player-js-demo
