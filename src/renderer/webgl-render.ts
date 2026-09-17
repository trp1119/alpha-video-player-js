import VSHADER_SOURCE from '../shaders/vertex.glsl'
import FSHADER_SOURCE from '../shaders/fragment.glsl'
import { computeVertexCoord, videoFrameReady } from '../util'
import type { IConfig } from '../type'
import Video from './video'

export default class WebGLRender extends Video {
  private gl: WebGLRenderingContext | null
  private vertexShader: WebGLShader | null
  private fragmentShader: WebGLShader | null
  private program: WebGLProgram | null
  private texture: WebGLTexture | null
  private vertexBuffer: WebGLBuffer | null
  private onContextLost = (event: Event) => this.onError(event)

  constructor (config: IConfig, canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    super(config, false, canvas)
    this.gl = gl
    try {
      this.initWebGLRender()
      canvas.addEventListener('webglcontextlost', this.onContextLost)
    } catch (error) {
      this.destroy(false)
      throw error
    }
  }
  /**
   * 初始化 webgl 渲染器
   */
  private initWebGLRender () {
    const { canvas, gl } = this

    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.viewport(0, 0, canvas.width, canvas.height)

  
    this.vertexShader = this.initShader(gl.VERTEX_SHADER, VSHADER_SOURCE)
    this.fragmentShader = this.initShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE)

    this.program = this.initProgram()
  
    this.texture = this.initTexture()
    this.vertexBuffer = this.initVertexBuffer()
  }

  /**
   * 初始化着色器
   * @param type 着色器类型
   * @param source 着色器代码
   * @returns 着色器对象
   */
  private initShader (type: number, source: string) {
    const { gl } = this
    // 创建着色器对象
    const shader = gl.createShader(type)
    if (!shader) throw new Error('[alpha-video-player-js]: Unable to allocate a WebGL shader.')
    if (type === gl.VERTEX_SHADER) this.vertexShader = shader
    else this.fragmentShader = shader
    // 指定着色器对象代码
    gl.shaderSource(shader, source)
    // 编译着色器
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`[alpha-video-player-js]: WebGL shader compilation failed: ${gl.getShaderInfoLog(shader) || ''}`)
    }
  
    return shader
  }
  /**
   * 初始化程序对象
   * @returns 程序对象
   */
  private initProgram () {
    const { gl } = this
    // 创建程序对象
    const program = gl.createProgram()
    if (!program) throw new Error('[alpha-video-player-js]: Unable to allocate a WebGL program.')
    this.program = program
    // 为程序对象分配着色器
    gl.attachShader(program, this.vertexShader)
    gl.attachShader(program, this.fragmentShader)
    // 连接程序对象
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`[alpha-video-player-js]: WebGL program linking failed: ${gl.getProgramInfoLog(program) || ''}`)
    }
    // 告知 WebGL 系统所使用的程序对象
    gl.useProgram(program)
  
    return program
  }
  /**
   * 初始化纹理
   */
  private initTexture () {
    const { gl } = this
    // 创建纹理对象
    const texture = gl.createTexture()
    if (!texture) throw new Error('[alpha-video-player-js]: Unable to allocate a WebGL texture.')
    this.texture = texture
    // 对纹理图像进行 Y 轴反转
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    // 激活 0 号纹理单元
    gl.activeTexture(gl.TEXTURE0)
    // 绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture)
    // 配置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return texture
  }
  /**
   * 设置顶点着色器与片元着色器信息
   */
  private initVertexBuffer () {
    const { gl, program, config } = this
    const coords = this.computeVertexCoords(config)
    // 创建缓冲区对象
    const vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) throw new Error('[alpha-video-player-js]: Unable to allocate a WebGL buffer.')
    this.vertexBuffer = vertexBuffer
    // 将顶点坐标和纹理坐标写入缓冲区对象
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW)

    const FSIZE = coords.BYTES_PER_ELEMENT

    // 分配坐标并开启
    const a_Position = gl.getAttribLocation(program, 'a_Position')
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 6, 0)
    gl.enableVertexAttribArray(a_Position)

    const a_Video_Texture_Position = gl.getAttribLocation(program, 'a_Video_Texture_Position')
    gl.vertexAttribPointer(a_Video_Texture_Position, 2, gl.FLOAT, false, FSIZE * 6, FSIZE * 2)
    gl.enableVertexAttribArray(a_Video_Texture_Position)

    const a_Alpha_Video_Texture_Position = gl.getAttribLocation(program, 'a_Alpha_Video_Texture_Position')
    gl.vertexAttribPointer(a_Alpha_Video_Texture_Position, 2, gl.FLOAT, false, FSIZE * 6, FSIZE * 4)
    gl.enableVertexAttribArray(a_Alpha_Video_Texture_Position)

    // 将纹理单元传递给片元着色器
    const u_Sampler = gl.getUniformLocation(program, 'u_Sampler')
    gl.uniform1i(u_Sampler, 0)

    return vertexBuffer
  }

  private computeVertexCoords (config: IConfig) {
    const { orientation, side, alphaScale, alphaAlign } = config
    return computeVertexCoord(orientation, side, alphaScale, alphaAlign)
  }

  protected onConfigUpdated (previous: IConfig, next: IConfig) {
    super.onConfigUpdated(previous, next)
    if (
      previous.orientation === next.orientation && previous.side === next.side &&
      previous.alphaScale === next.alphaScale && previous.alphaAlign === next.alphaAlign
    ) return
    if (!this.gl || !this.vertexBuffer) return
    const coords = this.computeVertexCoords(next)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, coords, this.gl.STATIC_DRAW)
  }
  protected onCanvasResized () {
    const { gl, canvas } = this
    if (!gl || !canvas) return
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  /**
   * 绘制一帧
   */
  protected drawFrameOnce () {
    const { gl, video } = this
    if (!gl || gl.isContextLost() || !video || !this.canPlay || !videoFrameReady(video)) return
    // 清除颜色缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT)
    // 为纹理对象分配纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
    // 绘制
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  /**
   * 播放结束触发
   */
  protected onEnded () {
    const { gl, config } = this
    // 清除颜色缓冲区
    config.autoClear && gl.clear(gl.COLOR_BUFFER_BIT)
    super.onEnded()
  }
  /**
   * 销毁
   */
  protected releaseRenderResources () {
    const { canvas, gl, vertexShader, fragmentShader, texture, vertexBuffer, program } = this
    let releaseError: unknown
    const release = (task: () => void) => {
      try {
        task()
      } catch (error) {
        releaseError ??= error
      }
    }

    release(() => canvas?.removeEventListener('webglcontextlost', this.onContextLost))
    // 初始化中途失败时也要释放已分配的部分资源。
    if (gl) {
      if (program && vertexShader) release(() => gl.detachShader(program, vertexShader))
      if (program && fragmentShader) release(() => gl.detachShader(program, fragmentShader))
      if (vertexShader) release(() => gl.deleteShader(vertexShader))
      if (fragmentShader) release(() => gl.deleteShader(fragmentShader))
      if (texture) release(() => gl.deleteTexture(texture))
      if (vertexBuffer) release(() => gl.deleteBuffer(vertexBuffer))
      if (program) release(() => gl.deleteProgram(program))
      release(() => gl.getExtension('WEBGL_lose_context')?.loseContext())
    }
    this.gl = null
    this.vertexShader = null
    this.fragmentShader = null
    this.texture = null
    this.vertexBuffer = null
    this.program = null    
    if (releaseError) throw releaseError
  }
}
