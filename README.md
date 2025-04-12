# alpha-video-player-js

## 简介

alpha-video-player-js 是一个 Web 视频动画特效播放 sdk，可以通过制作 Alpha 通道分离的视频素材，在 Web 端通过 WebGL 或 Canvas 重新实现 RGB 通道和 Alpha 通道的融合，从而实现播放带透明通道的视频。

- 零依赖

- 接入体积小（3.95K）
- 还原度高
- 兼容 WebGL（GPU） 及 Canvas（CPU） 降级，性能优异
- 支持 横向 - RGB 通道视频在前、横向 - RGB 通道视频在后、纵向 - RGB 通道视频在前、纵向 - RGB 通道视频在后 四类视频融合

## 使用

### 安装

```bash
npm i alpha-video-player-js
```

### 创建实例

```bash
import AlphaVideoPlayerJs from 'alpha-video-player-js'

const player = new AlphaVideoPlayerJs(config)
```

### 实例参数

| 参数          | 含义                               | 默认值    | 是否必传 |
| ------------- | ---------------------------------- | --------- | -------- |
| container     | dom 容器                           | null      | 是       |
| src           | 播放地址                           | ''        | 是       |
| width         | 渲染宽度（默认取父级宽度）                              | -         | 否       |
| height        | 渲染高度（默认取父级高度）                              | -         | 否       |
| muted         | 是否静音播放                                            | true      | 否       |
| loop          | 是否循环播放                                            | false     | 否       |
| playbackRate  | 播放速率                                                | 1         | 否       |
| fps           | 播放帧率                                                | 0        | 否       |
| videoFrame    | 是否启用 requestVideoFrameCallback 渲染                 | false     | 否       |
| orientation   | 视频排布方式 landscape \| portrait                      | landscape | 否       |
| side          | RGB 通道视频位置 front \| back                          | front     | 否       |
| autoShow      | 是否自动显示（初始化后自动显示第一帧）                  | false     | 否       |
| autoClear     | 是否自动清除（播放完毕后自动清除显示内容）              | true      | 否       |
| autoDestroy   | 是否自动销毁（播放完毕后自动销毁 canvas 与 video 元素） | false     | 否       |
| debug         | 是否开启 sdk 错误打印                                   | false     | 否       |
| onInitSuccess | 初始化成功回调                                          | -         | 否       |
| onInitError   | 初始化失败回调                                          | -         | 否       |
| onLoad        | 加载完毕回调                                            | -         | 否       |
| onCanPlay     | 可以播放回调                                            | -         | 否       |
| onPlay        | 开始播放回调                                            | -         | 否       |
| onLood        | 循环播放回调                                            | -         | 否       |
| onPause       | 暂停播放回调                                            | -         | 否       |
| onEnded       | 结束播放回调                                            | -         | 否       |
| onError       | 播放错误回调                                            | -         | 否       |
| onDestroy | 销毁实例回调 | - | 否 |

### 实例属性

| 方法    | 含义       | 类型    |
| ------- | ---------- | ------- |
| playing | 是否播放中 | Boolean |
| loop    | 是否循环   | Boolean |

### 实例方法

| 方法                          | 含义             | 参数                |
| ----------------------------- | ---------------- | ------------------- |
| play()                        | 播放/继续播放    | -                   |
| pause()                       | 暂停播放         | -                   |
| destroy()                     | 销毁实例         | -                   |
| reset()                       | 重置播放进度     | -                      |
| setSrc(src)                   | 设置播放地址     | 播放地址（string）     |
| setCurrentTime(time)          | 设置播放进度     | 播放进度（number，秒） |
| setMute(muted)                | 设置是否静音播放 | 是否静音（boolean）    |
| setLoop(loop)                 | 设置是否循环播放 | 是否循环（boolean）    |
| setPlaybackRate(playbackRate) | 设置播放倍速     | 播放倍速（number）     |

## 原理

- WebGLRender 使用 webgl texture 获取 video RGB 通道视频 和 Alpha 通道视频纹理，并在 shader 中进行自定义融合
- CanvasRender 使用 canvas2d getImageData 获取 video RGB 通道视频 和 Alpha 通道视频图片元数据，并进行自定义融合

## 示例

https://trp1119.github.io/alpha-video-player-js-demo