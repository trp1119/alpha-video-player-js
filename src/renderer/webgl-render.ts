import VSHADER_SOURCE from '../shaders/vertex.glsl'
import FSHADER_SOURCE from '../shaders/fragment.glsl'
import { computeVertexCoord } from '../util'
import type { IConfig } from '../type'
import Video from './video'

export default class WebGLRender extends Video {
  private gl: WebGLRenderingContext
  private vertexShader: WebGLShader
  private fragmentShader: WebGLShader
  private program: WebGLProgram
  private texture: WebGLTexture
  private vertexBuffer: WebGLBuffer

  constructor (config: IConfig) {
    const { onInitSuccess, onInitError } = config
     try {
      super(config)
      this.initWebGLRender()

      onInitSuccess && onInitSuccess()
    } catch (e: any) {
      onInitError && onInitError(e)
    }
  }
  /**
   * 初始化 webgl 渲染器
   */
  private initWebGLRender () {
    const { canvas } = this
    const gl = this.gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext)

    gl.disable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
    // 指定着色器对象代码
    gl.shaderSource(shader, source)
    // 编译着色器
    gl.compileShader(shader)
    // 检查着色器编译结果（耗费性能，仅在调试阶段启用）
    if (this.config.debug) {
      const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
      console.log('[alpha-video-player-js] shader compile result: ', type, compiled)
      if (!compiled) {
        console.log('[alpha-video-player-js] shader compile fail: ', type, gl.getShaderInfoLog(shader))
      }
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
    // 为程序对象分配着色器
    gl.attachShader(program, this.vertexShader)
    gl.attachShader(program, this.fragmentShader)
    // 连接程序对象
    gl.linkProgram(program)
    // 检查程序对象与着色器连接结果（耗费性能，仅在调试阶段启用）
    if (this.config.debug) {
      const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
      console.log('[alpha-video-player-js] program connect shader result: ', linked)
      if (!linked) {
        console.log('[alpha-video-player-js] program connect shader fail: ', gl.getProgramInfoLog(program))
      }
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
    const { orientation, side } = config
    const coords = computeVertexCoord(orientation, side)
    // 创建缓冲区对象
    const vertexBuffer = gl.createBuffer()
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
  /**
   * 绘制一帧
   */
  protected drawFrameOnce () {
    const { gl, video } = this
    if (!gl || !video || !this.canPlay) return
    // 清除颜色缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT)
    // 为纹理对象分配纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
    // 绘制
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  /**
   * 逐帧绘制当前视频内容
   */
  protected drawFrame () {
    this.drawFrameOnce()
    // 重复
    super.drawFrame()
  }
  /**
   * 播放结束触发
   */
  protected onEnded () {
    const { gl, config } = this
    // 清除颜色缓冲区
    config.autoClear && gl.clear(gl.COLOR_BUFFER_BIT)
    super.onEnded()
    config.autoDestroy && this.destroy()
  }
  /**
   * 销毁
   */
  public destroy () {
    const { canvas, gl, vertexShader, fragmentShader, texture, vertexBuffer, program } = this
    if (!canvas || !gl) return
    super.destroy()
    // 清除 dom
    canvas.parentNode.removeChild(canvas)
    // 分离着色器对象
    gl.detachShader(program, vertexShader)
    // 删除着色器对象
    gl.deleteShader(vertexShader)
    gl.detachShader(program, fragmentShader)
    gl.deleteShader(fragmentShader)
    // 删除纹理对象
    gl.deleteTexture(texture)
    // 删除缓冲区对象
    gl.deleteBuffer(vertexBuffer)
    // 删除程序对象
    gl.deleteProgram(program)
    // 释放内存
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.canvas = null
    this.gl = null
    this.vertexShader = null
    this.fragmentShader = null
    this.texture = null
    this.vertexBuffer = null
    this.program = null    
  }
}