# AI 协作文档 — alpha-video-player-js

> 本文档面向 AI 编码助手，帮助快速理解项目结构、核心概念和修改路径。

## 1. 项目定位

`alpha-video-player-js` 是一个 **Web 端透明视频播放 SDK**。它接收一段"左右/上下拼合"的特殊 MP4 视频（一半是 RGB 画面，一半是灰度 Alpha 遮罩），在 `<canvas>` 上逐帧合成出**带透明度的动画效果**，实现类似 APNG / Lottie 的动效，但支持更复杂的视频级内容。

**核心原理**：将一张视频帧拆成 RGB 区域和 Alpha 区域，用 Alpha 区域的 R 通道作为透明度，叠加到 RGB 区域上，产出带透明度的画面。

## 2. 技术栈

| 项目 | 说明 |
|------|------|
| 语言 | TypeScript（target ES5） |
| 构建 | Rollup + rollup-plugin-typescript2 + rollup-plugin-glslify + @rollup/plugin-terser |
| 输出 | 单文件 ESM（`dist/alpha-video-player-js.js`）+ 类型声明（`.d.ts`） |
| 运行时依赖 | **零**（纯浏览器 API） |
| 渲染方案 | WebGL 优先，Canvas 2D 降级 |

## 3. 目录结构

```
src/
├── index.ts                  # 库入口，门面类 Render（JS 版）
├── framework-expose.ts       # Vue 2/3 ref 与 React ref 共用的 imperative 类型（AlphaVideoPlayerExpose）
├── vue3.ts                   # Vue 3 子入口
├── vue2.ts                   # Vue 2 子入口
├── react.ts                  # React 子入口
├── type.ts                   # 所有 TypeScript 类型定义
├── util.ts                   # 工具函数（能力检测、坐标计算、canvas 创建等）
├── glsl.d.ts                 # GLSL 文件模块声明
├── vue2-shim.d.ts            # vue2 别名模块声明
├── components/
│   ├── vue3.ts               # Vue 3 组件（Composition API + defineComponent）
│   ├── vue2.ts               # Vue 2.7+ 组件（Options API + as any 断言）
│   └── react.tsx             # React 组件（forwardRef + hooks）
├── renderer/
│   ├── video.ts              # 基类 Video：视频管理、帧循环、事件、生命周期
│   ├── webgl-render.ts       # WebGL 渲染子类
│   └── canvas-render.ts      # Canvas 2D 渲染子类（降级方案）
└── shaders/
    ├── vertex.glsl           # 顶点着色器
    └── fragment.glsl         # 片元着色器（RGB + Alpha 合成）
```

### 产物结构

```
dist/
├── alpha-video-player-js.js   # JS 核心（ESM）
├── alpha-video-player-js.d.ts # JS 核心类型
├── vue3.js / vue3.d.ts        # Vue 3 组件
├── vue2.js / vue2.d.ts        # Vue 2 组件
└── react.js / react.d.ts      # React 组件
```

## 4. 类继承关系与模块依赖

```
Render（index.ts，门面 / 策略选择）
  ├── WebGLRender（webgl-render.ts）extends Video
  └── CanvasRender（canvas-render.ts）extends Video
        └── Video（video.ts，公共基类）

框架组件 → 都依赖 Render（核心会被内联到各组件产物中）
  ├── components/vue3.ts  → import Render from '../index'
  ├── components/vue2.ts  → import Render from '../index'
  └── components/react.tsx → import Render from '../index'

framework-expose.ts → import type Render from './index'（仅类型，供 Vue2/3 子入口与 react 的 ref 类型共用）

type.ts ← 被所有模块引用
util.ts ← 被 Video / WebGLRender / CanvasRender 引用
shaders/*.glsl ← 仅被 WebGLRender 引用
```

## 5. 核心概念

### 5.1 Alpha 视频格式

一段普通 MP4，但画面由两部分拼合：

- **RGB 区域**：原始彩色画面
- **Alpha 区域**：灰度遮罩（白色 = 不透明，黑色 = 全透明）

拼合方式由 `orientation` 决定：

| orientation | 布局 | RGB 在哪 / Alpha 在哪 |
|-------------|------|----------------------|
| `'landscape'` | 左右拼合 | `side='front'` → RGB 在左、Alpha 在右 |
| `'portrait'` | 上下拼合 | `side='front'` → RGB 在上、Alpha 在下 |

`side` 参数控制 RGB/Alpha 的前后位置，`'back'` 则反转。

### 5.2 渲染策略选择

```
supportWebGL()  → true  → WebGLRender
supportWebGL()  → false → supportCanvas2d() → true  → CanvasRender
                                              → false → 抛出异常
```

### 5.3 帧循环策略（`Video.initAdaptAnimation`）

按优先级选择最佳帧驱动方式：

1. `requestVideoFrameCallback`（需 `config.videoFrame = true` 且浏览器支持）
2. `requestAnimationFrame`（可选 `fps` 限帧）
3. `setTimeout` 兜底

### 5.4 autoResize 自适应

视频 `loadedmetadata` 后，根据 `autoResize` 配置自动调整 canvas 尺寸：

- `'contain'`（默认）：保持视频比例，完整填入容器
- `'width'`：固定宽度，按比例调整高度
- `'height'`：固定高度，按比例调整宽度
- `false`：不调整

调整后调用 `onCanvasResized()`，子类在此更新 GL viewport 或重建临时 canvas。

## 6. 各文件详解

### 6.1 `index.ts` — 门面类

```typescript
export default class Render {
  private render: WebGLRender | CanvasRender
  // 根据浏览器能力选择渲染器
  // 对外暴露：play / pause / destroy / reset / setSrc / setCurrentTime / setMute / setLoop / setPlaybackRate
  // 以及 getter：playing / loop
}
export type { IConfig, IOptionalConfig, IOrientation, ISide }
export type IAlphaVideoPlayer = InstanceType<typeof Render>
```

修改要点：新增公开方法时在此添加代理；若框架组件 `expose` / 命令式方法有变，同步更新 `framework-expose.ts` 与 `components/react.tsx` 中的 `AlphaVideoPlayerRef`。

### 6.1.1 `framework-expose.ts` — 框架 ref 类型

- 导出 **`AlphaVideoPlayerExpose`**：`play` / `pause` / `destroy` / `reset` / `setSrc` / `setCurrentTime` / `setMute` / `setLoop` / `setPlaybackRate` / `getPlayer`，与 `components/vue3.ts` 的 `expose({ ... })` 一致。
- `vue3.ts`、`vue2.ts` 子入口 **re-export** 该类型；React 侧 **`AlphaVideoPlayerRef`** 为其别名（`export type AlphaVideoPlayerRef = AlphaVideoPlayerExpose`）。
- 仅 **import type** 依赖 `./index` 中的 `Render` 类，用于 `getPlayer()` 返回类型，无运行时循环依赖。

### 6.2 `type.ts` — 类型定义

| 类型 | 用途 |
|------|------|
| `IConfig` | 构造函数完整配置（container + src 必填） |
| `IOptionalConfig` | `play()` 调用时的可选配置（container/src 变可选） |
| `IOrientation` | `'landscape' \| 'portrait'` |
| `ISide` | `'front' \| 'back'` |
| `ICoords` | WebGL 纹理坐标映射表类型 |
| `IImageCoords` | Canvas 2D 的 `[x, y, w, h]` 裁剪区域 |

### 6.3 `util.ts` — 工具函数

| 函数 | 作用 |
|------|------|
| `getDpr()` | 获取设备像素比，SSR 安全 |
| `supportCanvas2d()` | 检测 Canvas 2D 支持 |
| `supportWebGL()` | 检测 WebGL 支持 |
| `initCanvas(container, w?, h?)` | 创建 canvas 元素并插入容器，按 DPR 设置像素尺寸 |
| `computeDisplayRatio(vw, vh, orientation)` | 计算 alpha 视频的实际显示宽高比 |
| `resizeCanvas(canvas, w, h)` | 更新 canvas 像素尺寸和 CSS 尺寸 |
| `computeVertexCoord(orientation, side)` | **WebGL 专用**：返回交错的顶点+RGB纹理+Alpha纹理坐标 Float32Array |
| `computeImageCoord(orientation, side, w, h)` | **Canvas 2D 专用**：返回 `getImageData` 的裁剪区域坐标 |
| `computeSize(orientation, type, size)` | Canvas 2D 临时画布尺寸计算 |
| `videoExists(video)` | 断言 video 已存在 |
| `getRequestAnimationFrame()` | 跨浏览器 rAF，SSR 安全 |
| `getCancelAnimationFrame()` | 跨浏览器 cAF，SSR 安全 |

**坐标系统关键数据**：`DEFINE_COORDS` 常量定义了 4 种布局下的纹理 UV 映射（landscape/portrait × front/back）。

### 6.4 `renderer/video.ts` — 基类

**职责**：

- 创建隐藏的 `<video>` 元素并挂到 `document.body`
- 管理视频生命周期事件（loadedmetadata / canplaythrough / play / pause / ended / error）
- 帧循环驱动（`drawFrame` → 子类 `drawFrameOnce` → 递归）
- `autoResize` 计算与通知
- 公共 API：play / pause / destroy / reset / setSrc / setCurrentTime / setMute / setLoop / setPlaybackRate

**关键设计**：

- `drawFrameOnce()` 是空方法，由子类覆写实现具体渲染
- `drawFrame()` 调用 `drawFrameOnce()` 后通过 `adaptAnimation` 递归自身
- `onCanvasResized()` 是空方法，子类覆写以响应 canvas 尺寸变化
- `bindInstance()` 手动绑定 this，确保事件监听器正确引用

**属性**（`destroy()` 后带 `| null` 的属性会被置空）：

| 属性 | 类型 | 可见性 | 说明 |
|------|------|--------|------|
| `config` | `IConfig \| null` | protected | 当前配置 |
| `container` | `HTMLElement \| null` | protected | 容器 DOM |
| `video` | `HTMLVideoElement \| null` | protected | 隐藏的 video 元素（挂在 `document.body`） |
| `canvas` | `HTMLCanvasElement \| null` | protected | 渲染目标 canvas |
| `canvasWidth / canvasHeight` | `number` | protected | canvas 像素尺寸（含 DPR） |
| `videoWidth / videoHeight` | `number` | protected | 视频原始尺寸 |
| `canPlay` | `boolean` | protected | video 是否可以播放 |
| `playing` | `boolean` | public | 当前是否正在播放 |
| `animationId` | `number` | private | 帧循环 ID（销毁后置 `0`） |
| `adaptAnimation` | `Function \| null` | private | 帧驱动策略函数 |

### 6.5 `renderer/webgl-render.ts` — WebGL 渲染

**渲染流程**：

1. 构造时：获取 WebGL 上下文 → 编译着色器 → 创建程序 → 初始化纹理 → 设置顶点缓冲区
2. 每帧（`drawFrameOnce`）：`gl.clear` → `gl.texImage2D`（将 video 帧上传为纹理）→ `gl.drawArrays` 绘制四边形

**WebGL 管线**：

```
顶点数据 (Float32Array，每顶点 6 个 float)
  [position.xy, rgbTexCoord.xy, alphaTexCoord.xy] × 4 个顶点

vertex.glsl：传递 3 套坐标
fragment.glsl：rgb = texture(rgbCoord).rgb, alpha = texture(alphaCoord).r
```

**销毁**：分离/删除着色器 → 删除纹理 → 删除缓冲区 → 删除程序 → loseContext 释放资源

### 6.6 `renderer/canvas-render.ts` — Canvas 2D 渲染（降级）

**渲染流程**：

1. 构造时：创建临时 canvas（尺寸为原始 2 倍宽或高，取决于 orientation）
2. 每帧（`drawFrameOnce`）：
   - `tempContext2d.drawImage(video)` 将整帧缩放绘制到临时 canvas
   - `getImageData` 分别获取 RGB 区域和 Alpha 区域的像素数据
   - 逐像素：`imageData[i+3] = alphaData[i]`（用 Alpha 区的 R 通道替换 RGB 区的 A 通道）
   - `putImageData` 写回主 canvas

**性能注意**：逐像素操作较慢，仅作为 WebGL 不可用时的降级。

### 6.7 `shaders/` — GLSL 着色器

**vertex.glsl**：接收 3 个 attribute（顶点位置、RGB 纹理坐标、Alpha 纹理坐标），通过 varying 传递给片元。

**fragment.glsl**：核心一行 —— `gl_FragColor = vec4(texture2D(u_Sampler, rgbCoord).rgb, texture2D(u_Sampler, alphaCoord).r)`，从同一纹理的不同区域采样 RGB 和 Alpha。

## 7. 数据流

```
用户 new Render(config)
  │
  ├── 检测 WebGL / Canvas2D 能力
  ├── 创建 canvas 插入 container
  ├── 若有 src，创建隐藏 video 并 load
  │
  └── video 事件驱动：
        loadedmetadata → onLoad()  → autoResize 计算 → onCanvasResized()
        canplaythrough → onCanplay() → autoShow 则 drawFrameOnce()
        
用户 play()
  │
  ├── video.play()
  └── drawFrame() 启动帧循环
        ├── drawFrameOnce() ← 子类实现真正的渲染
        └── adaptAnimation(drawFrame) 递归
  
用户 pause()  → video.pause() + cancelDrawFrame()
用户 destroy() → 停止帧循环 → 移除事件 → 清理 video → 清理 GL/Canvas 资源 → 移除 canvas
```

## 8. 配置项速查

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `container` | HTMLElement | **必填** | 挂载容器 |
| `src` | string | — | 视频地址 |
| `width` / `height` | number | 容器尺寸 | canvas 逻辑尺寸 |
| `crossOrigin` | string | `'anonymous'` | 跨域策略 |
| `muted` | boolean | `true` | 静音 |
| `loop` | boolean | `false` | 循环 |
| `playbackRate` | number | `1` | 倍速 |
| `fps` | number | `0`（不限帧） | 限帧率 |
| `orientation` | `'landscape' \| 'portrait'` | `'landscape'` | 视频拼合方向 |
| `side` | `'front' \| 'back'` | `'front'` | RGB 区域位置 |
| `videoFrame` | boolean | `false` | 使用 requestVideoFrameCallback |
| `autoShow` | boolean | `false` | canplay 后自动绘制首帧 |
| `autoClear` | boolean | `true` | 播放结束后清空 canvas |
| `autoDestroy` | boolean | `false` | 播放结束后自动销毁 |
| `autoResize` | `'width' \| 'height' \| 'contain' \| false` | `'contain'` | 自适应尺寸模式 |
| `debug` | boolean | `false` | 输出调试信息 |
| `onInitSuccess` | `() => void` | — | 初始化成功回调 |
| `onInitError` | `(e) => void` | — | 初始化失败回调 |
| `onLoad` | `() => void` | — | 视频 metadata 加载完成 |
| `onCanPlay` | `() => void` | — | 首次可播放 |
| `onPlay` | `() => void` | — | 播放开始 |
| `onLoop` | `() => void` | — | 循环播放时触发 |
| `onPause` | `() => void` | — | 暂停 |
| `onEnded` | `() => void` | — | 播放结束 |
| `onError` | `(e) => void` | — | 出错 |
| `onDestroy` | `() => void` | — | 销毁完成 |

## 9. 构建与开发

```bash
npm run dev      # Rollup 监听模式
npm run build    # 生产构建（含 terser 压缩）
npm run release  # 交互式发版（patch/minor/major → build → tag → publish）
```

产物：

- `dist/alpha-video-player-js.js` + `.d.ts`（JS 核心）
- `dist/vue3.js` + `.d.ts`（Vue 3 组件）
- `dist/vue2.js` + `.d.ts`（Vue 2 组件）
- `dist/react.js` + `.d.ts`（React 组件）

## 10. 常见修改场景指引

### 新增公开 API

1. 在 `renderer/video.ts` 的 `Video` 类中添加方法实现
2. 在 `index.ts` 的 `Render` 类中添加代理方法
3. 在三个框架组件中补充对应的 expose / methods / imperativeHandle
4. 更新 `framework-expose.ts` 中的 `AlphaVideoPlayerExpose`，并保持 `react.tsx` 中 `AlphaVideoPlayerRef` 与之同步

### 新增配置项

1. 在 `type.ts` 的 `IConfig` 接口中添加字段
2. 若有默认值，在 `renderer/video.ts` 的 `DEFAULT_CONFIG` 中补充
3. 在相应的渲染逻辑中消费该配置
4. 在三个框架组件中补充对应的 props 和传参

### 新增框架组件

1. 在 `src/components/` 下新建组件文件
2. 在 `src/` 下新建子入口（re-export）
3. 在 `rollup.config.js` 的 `frameworkEntries` 中追加配置
4. 在 `package.json` 的 `exports` 中追加子路径

### 修改渲染逻辑

- **WebGL 方面**：修改 `renderer/webgl-render.ts` 的 `drawFrameOnce()` 或 `shaders/` 中的 GLSL
- **Canvas 2D 方面**：修改 `renderer/canvas-render.ts` 的 `drawFrameOnce()`
- **两者共同逻辑**：修改 `renderer/video.ts` 基类

### 修改坐标映射 / 支持新的拼合布局

- 修改 `util.ts` 中的 `DEFINE_COORDS`（WebGL 用）和 `IMAGE_COORDS_MAP`（Canvas 2D 用）
- 同步更新 `type.ts` 中的 `IOrientation` 类型

### 修改帧循环策略

- 修改 `renderer/video.ts` 中的 `initAdaptAnimation()` 方法

### 修改自适应逻辑

- 修改 `renderer/video.ts` 中的 `onLoad()` 方法和 `computeDisplayRatio()` 工具函数

## 11. 设计备忘

- **Canvas 2D 降级**：逐像素遍历性能远低于 WebGL，仅在 WebGL 不可用时启用。现代浏览器几乎全覆盖 WebGL。
- **video 挂载位置**：隐藏 video 挂在 `document.body`（`width: 0; height: 0`），而非 container 内，避免受容器 CSS（overflow / transform 等）影响。销毁时通过 `parentNode?.removeChild` 清理，与挂载位置无关。
- **destroy 后的空安全**：`destroy()` 将核心引用（`config`、`video`、`canvas`、GL 资源等）置 `null`，类型已标注 `| null`。销毁后不应再调用实例方法。

## 12. Vue 组件（`alpha-video-player-js/vue3`）模板侧注意

与 `components/vue3.ts` 的实现方式相关，接入业务或维护演示项目时需留意：

- **数字类 props**：`playbackRate` 等在组件内声明为 `Number`。原生 `<input type="range">` 使用 `v-model` 时，浏览器侧常为**字符串**，会触发 Vue 运行时的 prop 类型告警。应使用 **`v-model.number`**，或对绑定值做 **`Number(...)`** 再传入。
- **根节点与样式**：`setup` 的 `return` 仅为 `h('div', { ref: containerRef })`，**无业务 class**。需要绝对定位、与背景图对齐、响应式外壳等，应在**父级包裹元素**上写 class / style；画布逻辑尺寸仍通过 **`width` / `height` props** 传给组件（与 JS 版 `IConfig` 一致）。
- **销毁后再初始化**：`expose` 的 `destroy()` 会清空内部 `player`，且 **`init` 仅在 `onMounted` 调用**。用户手动 `destroy()` 后，同一组件实例不会自动再次 `init`。需要「销毁后再播」时，应对组件使用 **`:key` 变化**或 **`v-if` 重挂**，以触发新的挂载周期。演示仓库 **`alpha-video-player-js-demo`** 的 `Item.vue` 使用 **`playerKey` + `:key`** 实现该流程。
- **TypeScript 与 ref**：从 `alpha-video-player-js/vue3`（或 `vue2`）导入 **`AlphaVideoPlayerExpose`**，用于 `ref<AlphaVideoPlayerExpose | null>(null)`；内核实例类型用主包 **`IAlphaVideoPlayer`** 或 **`getPlayer()` 返回值**。若 `expose` 增删方法，在 **`src/framework-expose.ts`** 与 **`components/react.tsx`** 的 `AlphaVideoPlayerRef` 一并更新。
