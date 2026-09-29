import assert from 'node:assert/strict'
import { test } from 'node:test'
import Render, { AlphaVideoPlayerError, isAlphaVideoPlayerError } from '../dist/alpha-video-player-js.js'

// Deterministic DOM/GPU doubles exercise the shipped bundle's resource ownership
// and async ordering; real device decoding/capacity is intentionally not simulated.
function environment({ webgl = true, canvas2d = true, driver = 'raf', failTexture = false, failLoad = false, failUnload = false, failDelete = false, failCancel = false, nullResource, failCompile = false, failLink = false, failDraw = false } = {}) {
  const pending = new Map()
  const contexts = []
  const videos = []
  const eventErrors = []
  let nextId = 0
  const request = (kind, cb) => { const id = nextId++; pending.set(id, { kind, cb }); return id }
  const cancel = (kind, id) => {
    if (pending.has(id)) assert.equal(pending.get(id).kind, kind)
    pending.delete(id)
    if (failCancel) throw new Error('cancel failed')
  }
  class Element {
    constructor(tag) {
      this.listeners = new Map()
      this.tagName = tag
      this.style = {}
      this.children = []
      this.offsetWidth = 4
      this.offsetHeight = 4
      this.parentNode = null
    }
    setAttribute() {}
    removeAttribute(name) { if (name === 'src') this.src = '' }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type).add(listener)
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener) }
    dispatchEvent(event) {
      for (const listener of [...(this.listeners.get(event.type) || [])]) {
        // Browsers report listener exceptions without interrupting dispatch.
        try { listener(event) } catch (error) { eventErrors.push(error) }
      }
    }
    appendChild(child) { this.children.push(child); child.parentNode = this; return child }
    removeChild(child) {
      assert.ok(this.children.includes(child))
      this.children.splice(this.children.indexOf(child), 1)
      child.parentNode = null
      return child
    }
  }
  class Video extends Element {
    constructor() {
      super('video')
      Object.assign(this, { readyState: 4, videoWidth: 8, videoHeight: 4, paused: true, ended: false, currentTime: 0 })
      videos.push(this)
    }
    load() {
      if (failLoad && this.src) throw new Error('load failed')
      if (failUnload && !this.src) throw new Error('unload failed')
    }
    play() { this.paused = false; return this.playResult || Promise.resolve() }
    pause() { this.paused = true }
  }
  if (driver === 'video') {
    Video.prototype.requestVideoFrameCallback = cb => request('video', cb)
    Video.prototype.cancelVideoFrameCallback = id => cancel('video', id)
  }
  class Canvas extends Element {
    constructor() { super('canvas'); this.width = 4; this.height = 4 }
    getContext(kind) {
      if (this.contextType && this.contextType !== kind) return null
      if (this.context) return this.context
      if (kind === 'experimental-webgl') return null
      if (kind === 'webgl' && !webgl || kind === '2d' && !canvas2d) return null
      this.contextType = kind
      const state = { canvas: this, kind, released: false, draws: 0, bufferUploads: 0, resources: new Set() }
      contexts.push(state)
      this.context = new Proxy({}, {
        get(_target, key) {
          if (key === 'getExtension') return () => ({ loseContext: () => {
            state.released = true
            state.canvas.dispatchEvent(new Event('webglcontextlost'))
          } })
          if (key === 'isContextLost') return () => state.released
          if (key === 'getShaderParameter') return () => !failCompile
          if (key === 'getProgramParameter') return () => !failLink
          if (key === 'texImage2D' && failDraw) return () => { throw new Error('frame upload failed') }
          if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(state.canvas.width * state.canvas.height * 4) })
          if (key === 'drawArrays' || key === 'putImageData') return () => { state.draws++ }
          if (key === 'bufferData') return () => { state.bufferUploads++ }
          if (key.startsWith('create')) return () => {
            if (key === 'createTexture' && failTexture) throw new Error('texture allocation failed')
            if (key === nullResource) return null
            const resource = {}
            state.resources.add(resource)
            return resource
          }
          if (key.startsWith('delete')) return resource => {
            state.resources.delete(resource)
            if (failDelete) throw new Error('GPU cleanup failed')
          }
          if (key === 'VERTEX_SHADER') return 35633
          if (key === 'FRAGMENT_SHADER') return 35632
          if (key === key.toUpperCase()) return 1
          return () => 0
        },
      })
      return this.context
    }
  }
  globalThis.HTMLVideoElement = Video
  globalThis.document = {
    body: new Element('body'),
    createElement: tag => tag === 'video' ? new Video() : tag === 'canvas' ? new Canvas() : new Element(tag),
  }
  globalThis.window = {
    devicePixelRatio: 1,
    setTimeout: cb => request('timeout', () => cb()),
    clearTimeout: id => cancel('timeout', id),
  }
  if (driver !== 'timeout') {
    window.requestAnimationFrame = cb => request('raf', cb)
    window.cancelAnimationFrame = id => cancel('raf', id)
  }
  const create = (config = {}) => {
    const container = new Element('div')
    const player = new Render({ container, src: 'fixture.mp4', autoResize: false, videoFrame: driver === 'video', ...config })
    const video = videos.at(-1)
    video?.dispatchEvent(new Event('loadedmetadata'))
    video?.dispatchEvent(new Event('canplaythrough'))
    return { player, video, container }
  }
  const tick = (time = 0) => {
    for (const [id, { cb }] of [...pending]) if (pending.delete(id)) cb(time)
  }
  return { create, pending, contexts, videos, tick, Element, eventErrors }
}

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function flushPromises(times = 6) {
  while (times-- > 0) await Promise.resolve()
}

test('each transparent instance owns exactly one WebGL context, all are released', () => {
  const env = environment()
  const instances = Array.from({ length: 12 }, () => env.create())
  assert.equal(env.contexts.length, 12)
  for (const { player } of instances) player.destroy()
  assert.equal(document.body.children.length, 0)
  assert.ok(env.contexts.every(ctx => ctx.released && ctx.resources.size === 0))
})

for (const driver of ['raf', 'video', 'timeout']) {
  test(`${driver}: pausing and destroying one player leaves the other running (including callback ID 0)`, async () => {
    const env = environment({ driver })
    const a = env.create(), b = env.create()
    await Promise.all([a.player.play(), b.player.play()])
    assert.equal(env.pending.size, 2)
    a.player.pause()
    assert.equal(env.pending.size, 1)
    a.player.destroy()
    env.tick()
    assert.equal(b.player.playing, true)
    assert.equal(b.video.paused, false)
    assert.equal(b.container.children.length, 1)
    b.player.destroy()
    assert.equal(env.pending.size, 0)
  })

  test(`${driver}: repeated/concurrent play schedules one loop, pause cancels it`, async () => {
    const env = environment({ driver })
    const { player } = env.create()
    await Promise.all([player.play(), player.play(), player.play()])
    assert.equal(env.pending.size, 1)
    await player.play()
    assert.equal(env.pending.size, 1)
    player.pause()
    env.tick()
    assert.equal(env.pending.size, 0)
    assert.equal(player.playing, false)
    player.destroy()
  })
}

for (const alphaScale of [1, 0]) {
  for (const action of ['pause', 'setSrc', 'destroy']) {
    test(`alphaScale=${alphaScale}: pending play cannot restart after ${action}`, async () => {
      const env = environment()
      const { player, video } = env.create({ alphaScale })
      const wait = deferred()
      video.playResult = wait.promise
      const result = player.play()
      if (action === 'setSrc') player.setSrc('next.mp4')
      else player[action]()
      wait.resolve()
      await result
      assert.equal(player.playing, false)
      assert.equal(env.pending.size, 0)
      player.destroy()
    })
  }
}

for (const alphaScale of [1, 0]) {
  for (const action of ['pause', 'setSrc', 'destroy']) {
    test(`alphaScale=${alphaScale}: late play rejection after ${action} is treated as cancellation`, async () => {
      const env = environment()
      let errors = 0
      const { player, video } = env.create({ alphaScale, onError: () => errors++ })
      const wait = deferred()
      video.playResult = wait.promise
      const playing = player.play()
      if (action === 'setSrc') player.setSrc('next.mp4')
      else player[action]()
      wait.reject(new Error('browser aborted play'))
      assert.equal(await playing, undefined)
      assert.equal(errors, 0)
      if (action !== 'destroy') player.destroy()
    })
  }
}

test('stale play completion does not interfere with a newer play request', async () => {
  const env = environment()
  const { player, video } = env.create()
  const wait = deferred()
  video.playResult = wait.promise
  const first = player.play()
  player.pause()
  video.playResult = Promise.resolve()
  await player.play()
  wait.resolve()
  await first
  assert.equal(env.pending.size, 1)
  assert.equal(player.playing, true)
  player.destroy()
})

test('stale play rejection does not report or interfere with a newer play request', async () => {
  const env = environment()
  let errors = 0
  const { player, video } = env.create({ onError: () => errors++ })
  const wait = deferred()
  video.playResult = wait.promise
  const first = player.play()
  player.pause()
  video.playResult = Promise.resolve()
  await player.play()
  wait.reject(new Error('old play was aborted'))
  assert.equal(await first, undefined)
  assert.equal(errors, 0)
  assert.equal(env.pending.size, 1)
  assert.equal(player.playing, true)
  player.destroy()
})

test('a callback already delivered before pause/destroy cannot resurrect the loop', async () => {
  const env = environment()
  const { player } = env.create()
  await player.play()
  const staleCallback = [...env.pending.values()][0].cb
  player.pause()
  await player.play()
  staleCallback(10)
  assert.equal(env.pending.size, 1)
  player.destroy()
  staleCallback(20)
  assert.equal(env.pending.size, 0)
  assert.equal(player.playing, false)
})

test('native pause events stop drawing', async () => {
  const env = environment()
  const { player, video } = env.create()
  await player.play()
  video.pause()
  video.dispatchEvent(new Event('pause'))
  assert.equal(player.playing, false)
  assert.equal(env.pending.size, 0)
  player.destroy()
})

test('changing frame driver cancels callbacks using the original driver', async () => {
  const env = environment({ driver: 'video' })
  const { player, video, container } = env.create()
  const canvas = container.children[0]
  await player.play()
  await player.play({ videoFrame: false })
  assert.equal(env.pending.size, 1)
  assert.equal([...env.pending.values()][0].kind, 'raf')
  assert.equal(env.videos.length, 1)
  assert.equal(env.videos[0], video)
  assert.equal(env.contexts.length, 1)
  assert.equal(container.children[0], canvas)
  player.destroy()
  assert.equal(env.pending.size, 0)
})

test('onDestroy can reenter destroy and observes already-released resources', async () => {
  const env = environment()
  let count = 0
  let releasedInCallback = false
  const { player, container } = env.create({ onDestroy() {
    count++
    releasedInCallback = container.children.length === 0 && document.body.children.length === 0 &&
      env.pending.size === 0 && env.contexts.every(ctx => ctx.released)
    player.destroy()
  } })
  await player.play()
  player.destroy()
  player.destroy()
  assert.equal(count, 1)
  assert.equal(releasedInCallback, true)
})

test('throwing onDestroy cannot leave DOM or GPU resources behind', () => {
  const env = environment()
  const { player, container } = env.create({ onDestroy() { throw new Error('user callback') } })
  try { player.destroy() } catch {}
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  assert.ok(env.contexts.every(ctx => ctx.released))
})

for (const fault of [{ failTexture: true }, { failLoad: true }, { failCompile: true }, { failLink: true },
  ...['createShader', 'createProgram', 'createTexture', 'createBuffer'].map(nullResource => ({ nullResource }))]) {
  test(`initialization failure cleans all acquired resources: ${JSON.stringify(fault)}`, () => {
    const env = environment(fault)
    const container = new env.Element('div')
    let errors = 0, successes = 0, destroys = 0
    const player = new Render({ container, src: 'fixture.mp4', onInitError() { errors++ }, onInitSuccess() { successes++ }, onDestroy() { destroys++ } })
    assert.equal(errors, 1)
    assert.equal(successes, 0)
    assert.equal(destroys, 0)
    assert.equal(container.children.length, 0)
    assert.equal(document.body.children.length, 0)
    assert.ok(env.contexts.every(ctx => ctx.released && ctx.resources.size === 0))
    player.destroy()
  })
}

test('context loss reports an error and releases only the affected instance', async () => {
  const env = environment()
  let errors = 0
  const a = env.create({ onError(event) { assert.equal(event.type, 'webglcontextlost'); errors++ } })
  const b = env.create()
  await Promise.all([a.player.play(), b.player.play()])
  a.container.children[0].dispatchEvent(new Event('webglcontextlost'))
  assert.equal(errors, 1)
  assert.equal(env.eventErrors.length, 0)
  assert.equal(a.container.children.length, 0)
  assert.equal(env.pending.size, 1)
  env.tick()
  assert.equal(b.player.playing, true)
  b.player.destroy()
})

test('Canvas 2D fallback supports isolated instances and duplicate-play protection', async () => {
  const env = environment({ webgl: false })
  const a = env.create(), b = env.create()
  await Promise.all([a.player.play(), a.player.play(), b.player.play()])
  assert.equal(env.pending.size, 2)
  a.player.destroy()
  assert.equal(env.pending.size, 1)
  b.player.destroy()
  assert.equal(env.pending.size, 0)
  assert.equal(document.body.children.length, 0)
})

test('unsupported rendering reports initialization failure and leaves no DOM behind', () => {
  const env = environment({ webgl: false, canvas2d: false })
  const container = new env.Element('div')
  let errors = 0
  const player = new Render({ container, src: 'fixture.mp4', onInitError() { errors++ } })
  assert.equal(errors, 1)
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  player.destroy()
})

test('native video instances allocate no canvas or frame callbacks', async () => {
  const env = environment()
  const a = env.create({ alphaScale: 0 }), b = env.create({ alphaScale: 0 })
  await Promise.all([a.player.play(), b.player.play()])
  assert.equal(env.contexts.length, 0)
  assert.equal(env.pending.size, 0)
  a.player.destroy()
  assert.equal(b.player.playing, true)
  b.player.destroy()
})

test('missing source errors identify the operation and can be caught without onError', async () => {
  const env = environment()
  let reported = 0
  const { player } = env.create({ src: undefined, onError: () => reported++ })

  assert.throws(
    () => player.setMute(false),
    error => error instanceof AlphaVideoPlayerError &&
      error.code === 'VIDEO_SOURCE_MISSING' &&
      error.action === 'setMute' &&
      /no video source has been set/.test(error.message),
  )

  let caught
  try {
    await player.play()
  } catch (error) {
    caught = error
  }
  assert.equal(isAlphaVideoPlayerError(caught), true)
  assert.equal(caught.code, 'VIDEO_SOURCE_MISSING')
  assert.equal(caught.action, 'play')
  assert.equal(reported, 0)
  player.destroy()
})

test('destroyed player errors are distinct from missing source errors', async () => {
  const env = environment()
  const { player } = env.create()
  player.destroy()

  assert.throws(
    () => player.pause(),
    error => isAlphaVideoPlayerError(error) &&
      error.code === 'PLAYER_DESTROYED' &&
      error.action === 'pause' &&
      /player has been destroyed/.test(error.message),
  )
  await assert.rejects(
    player.play(),
    error => isAlphaVideoPlayerError(error) &&
      error.code === 'PLAYER_DESTROYED' && error.action === 'play',
  )
})

test('initialization failure has a dedicated error code for later API calls', () => {
  const env = environment({ webgl: false, canvas2d: false })
  const container = new env.Element('div')
  const player = new Render({ container, src: 'fixture.mp4', onInitError() {} })

  assert.throws(
    () => player.setLoop(true),
    error => isAlphaVideoPlayerError(error) &&
      error.code === 'PLAYER_NOT_INITIALIZED' &&
      error.action === 'setLoop' &&
      /Check onInitError/.test(error.message),
  )
  player.destroy()
})

test('updateConfig applies media options and source without recreating the renderer', () => {
  const env = environment()
  const { player, video, container } = env.create()
  const canvas = container.children[0]

  player.updateConfig({
    src: 'next.mp4',
    muted: false,
    loop: true,
    playbackRate: 1.5,
    autoClear: false,
  })

  assert.equal(env.contexts.length, 1)
  assert.equal(container.children[0], canvas)
  assert.equal(env.videos.at(-1), video)
  assert.equal(video.src, 'next.mp4')
  assert.equal(video.muted, false)
  assert.equal(video.loop, true)
  assert.equal(video.playbackRate, 1.5)
  player.destroy()
})

test('rapid transparent source updates resume only the latest source', async () => {
  const env = environment()
  const { player, video } = env.create({ alphaScale: 1 })
  await player.play()

  player.updateConfig({ src: 'first.mp4' })
  player.updateConfig({ src: 'second.mp4' })
  await flushPromises()
  assert.equal(player.playing, false)
  assert.equal(video.src, 'second.mp4')

  video.dispatchEvent(new Event('loadedmetadata'))
  video.dispatchEvent(new Event('canplaythrough'))
  await flushPromises()
  assert.equal(video.src, 'second.mp4')
  assert.equal(player.playing, true)
  assert.equal(env.pending.size, 1)
  player.destroy()
})

test('source update during a pending play resumes the latest source without reporting the cancelled request', async () => {
  const env = environment()
  let errors = 0
  const { player, video } = env.create({ alphaScale: 1, onError: () => errors++ })
  const wait = deferred()
  video.playResult = wait.promise
  const oldPlay = player.play()

  player.updateConfig({ src: 'next.mp4' })
  video.playResult = Promise.resolve()
  video.dispatchEvent(new Event('loadedmetadata'))
  video.dispatchEvent(new Event('canplaythrough'))
  wait.reject(new Error('old source was removed'))
  await oldPlay
  await flushPromises()

  assert.equal(video.src, 'next.mp4')
  assert.equal(errors, 0)
  assert.equal(player.playing, true)
  assert.equal(env.pending.size, 1)
  player.destroy()
})

test('updateConfig switches between transparent layouts without exposing renderer recreation', async () => {
  const env = environment()
  let destroys = 0, inits = 0
  const { player, container } = env.create({
    alphaScale: 1,
    onInitSuccess: () => inits++,
    onDestroy: () => destroys++,
  })
  const firstContext = env.contexts[0]
  const firstVideo = env.videos[0]
  const firstCanvas = container.children[0]

  await player.play()

  player.updateConfig({ alphaScale: 0.5, alphaAlign: 'end' })

  assert.equal(firstContext.released, false)
  assert.equal(firstContext.bufferUploads, 2)
  assert.equal(env.contexts.length, 1)
  assert.equal(env.videos.length, 1)
  assert.equal(env.videos.at(-1), firstVideo)
  assert.equal(container.children[0], firstCanvas)
  assert.equal(container.children.length, 1)
  assert.equal(document.body.children.length, 1)
  assert.equal(destroys, 0)
  assert.equal(inits, 1)
  assert.equal(player.playing, true)
  assert.equal(env.pending.size, 1)
  player.destroy()
  assert.equal(destroys, 1)
})

test('size updates resize the existing transparent canvas without reallocating WebGL', () => {
  const env = environment()
  const { player, container, video } = env.create({ alphaScale: 0.5, autoResize: false })
  const canvas = container.children[0]
  const context = env.contexts[0]

  player.updateConfig({ width: 10, height: 8 })

  assert.equal(container.children[0], canvas)
  assert.equal(canvas.width, 10)
  assert.equal(canvas.height, 8)
  assert.equal(env.contexts.length, 1)
  assert.equal(env.contexts[0], context)
  assert.equal(env.videos.at(-1), video)
  player.destroy()
})

test('updateConfig keeps the old output visible until a cross-mode replacement is playable', async () => {
  const env = environment()
  const { player, container } = env.create({ alphaScale: 1 })
  const oldCanvas = container.children[0]
  const oldContext = env.contexts[0]

  await player.play()

  player.updateConfig({ src: 'native.mp4', alphaScale: 0 })
  const nativeVideo = env.videos.at(-1)
  assert.equal(env.contexts.length, 1)
  assert.equal(oldContext.released, false)
  assert.equal(container.children.includes(oldCanvas), true)
  assert.equal(container.children.includes(nativeVideo), true)
  assert.notEqual(oldCanvas.style.visibility, 'hidden')
  assert.equal(nativeVideo.style.visibility, 'hidden')
  assert.equal(nativeVideo.style.position, 'absolute')

  nativeVideo.dispatchEvent(new Event('loadedmetadata'))
  nativeVideo.dispatchEvent(new Event('canplaythrough'))
  await flushPromises()

  assert.equal(oldCanvas.parentNode, null)
  assert.equal(oldContext.released, true)
  assert.equal(container.children.length, 1)
  assert.equal(container.children[0], nativeVideo)
  assert.equal(nativeVideo.style.visibility, 'visible')
  assert.equal(nativeVideo.style.position, '')
  assert.equal(player.playing, true)

  player.updateConfig({ src: 'alpha-lite.mp4', alphaScale: 0.5, alphaAlign: 'start' })
  const transparentVideo = env.videos.at(-1)
  assert.equal(env.contexts.length, 2)
  const nextCanvas = container.children.find(child => child.tagName === 'canvas')
  assert.equal(nativeVideo.parentNode, container)
  assert.equal(nextCanvas.style.visibility, 'hidden')
  assert.equal(nextCanvas.style.position, 'absolute')

  transparentVideo.dispatchEvent(new Event('loadedmetadata'))
  transparentVideo.dispatchEvent(new Event('canplaythrough'))
  await flushPromises()

  assert.equal(nativeVideo.parentNode, null)
  assert.equal(container.children.length, 1)
  assert.equal(container.children[0], nextCanvas)
  assert.equal(nextCanvas.style.visibility, 'visible')
  assert.equal(nextCanvas.style.position, '')
  assert.equal(document.body.children[0], transparentVideo)
  assert.equal(player.playing, true)
  player.destroy()
})

test('rapid cross-mode updates discard the hidden candidate and keep the visible renderer', async () => {
  const env = environment()
  const { player, container, video: originalVideo } = env.create({ alphaScale: 1 })
  const originalCanvas = container.children[0]
  const originalContext = env.contexts[0]
  await player.play()

  player.updateConfig({ src: 'native.mp4', alphaScale: 0 })
  const nativeCandidate = env.videos.at(-1)
  assert.equal(nativeCandidate.style.visibility, 'hidden')

  player.updateConfig({ src: 'next-alpha.mp4', alphaScale: 0.5 })
  await flushPromises()

  assert.equal(nativeCandidate.parentNode, null)
  assert.equal(container.children.length, 1)
  assert.equal(container.children[0], originalCanvas)
  assert.equal(originalContext.released, false)
  assert.equal(env.contexts.length, 1)
  assert.equal(env.videos[0], originalVideo)
  assert.equal(originalVideo.src, 'next-alpha.mp4')
  assert.equal(player.playing, true)
  player.destroy()
})

test('cross-mode media failure rolls back to the previous visible renderer', async () => {
  const env = environment()
  const errors = []
  const { player, container } = env.create({ alphaScale: 1, onError: error => errors.push(error) })
  const oldCanvas = container.children[0]
  const oldContext = env.contexts[0]
  await player.play()

  player.updateConfig({ src: 'native.mp4', alphaScale: 0 })
  const candidate = env.videos.at(-1)
  const mediaError = new Event('error')
  candidate.dispatchEvent(mediaError)
  await flushPromises()

  assert.deepEqual(errors, [mediaError])
  assert.equal(candidate.parentNode, null)
  assert.equal(container.children.length, 1)
  assert.equal(container.children[0], oldCanvas)
  assert.equal(oldContext.released, false)
  assert.equal(player.playing, true)
  player.destroy()
})

test('native source updates use a hidden candidate instead of blanking the visible video', async () => {
  const env = environment()
  const { player, container, video: oldVideo } = env.create({ alphaScale: 0 })
  await player.play()

  player.updateConfig({ src: 'next-native.mp4' })
  const nextVideo = env.videos.at(-1)
  assert.notEqual(nextVideo, oldVideo)
  assert.equal(oldVideo.parentNode, container)
  assert.equal(nextVideo.parentNode, container)
  assert.equal(nextVideo.style.visibility, 'hidden')
  assert.notEqual(oldVideo.style.visibility, 'hidden')

  nextVideo.dispatchEvent(new Event('loadedmetadata'))
  nextVideo.dispatchEvent(new Event('canplaythrough'))
  await flushPromises()

  assert.equal(oldVideo.parentNode, null)
  assert.equal(container.children.length, 1)
  assert.equal(container.children[0], nextVideo)
  assert.equal(nextVideo.style.visibility, 'visible')
  assert.equal(player.playing, true)
  player.destroy()
})

test('paused transitions retain the previous frame until play activates the candidate', async () => {
  const env = environment()
  const { player, container } = env.create({ alphaScale: 1, autoShow: false })
  const oldCanvas = container.children[0]
  await player.play()
  player.pause()

  player.updateConfig({ src: 'native.mp4', alphaScale: 0 })
  const candidate = env.videos.at(-1)
  candidate.dispatchEvent(new Event('loadedmetadata'))
  candidate.dispatchEvent(new Event('canplaythrough'))
  await flushPromises()

  assert.equal(oldCanvas.parentNode, container)
  assert.equal(candidate.style.visibility, 'hidden')
  assert.equal(player.playing, false)

  await player.play()
  assert.equal(oldCanvas.parentNode, null)
  assert.equal(candidate.parentNode, container)
  assert.equal(candidate.style.visibility, 'visible')
  assert.equal(player.playing, true)
  player.destroy()
})

test('renderer replacement invalidates a pending play from the old renderer', async () => {
  const env = environment()
  const { player, video: oldVideo } = env.create({ alphaScale: 1 })
  const wait = deferred()
  oldVideo.playResult = wait.promise
  const oldPlay = player.play()

  player.updateConfig({ src: 'native.mp4', alphaScale: 0 })
  const nativeVideo = env.videos.at(-1)
  const newPlay = player.play()
  nativeVideo.dispatchEvent(new Event('loadedmetadata'))
  nativeVideo.dispatchEvent(new Event('canplaythrough'))
  wait.reject(new Error('old renderer was removed'))
  await Promise.all([oldPlay, newPlay])

  assert.equal(oldVideo.parentNode, null)
  assert.equal(nativeVideo.paused, false)
  assert.equal(player.playing, true)
  assert.equal(env.pending.size, 0)
  player.destroy()
})

test('play(config) can change renderer mode and still starts exactly one loop', async () => {
  const env = environment()
  const { player } = env.create({ alphaScale: 0 })

  const playing = player.play({ src: 'alpha.mp4', alphaScale: 0.5 })
  const video = env.videos.at(-1)
  video.dispatchEvent(new Event('loadedmetadata'))
  video.dispatchEvent(new Event('canplaythrough'))
  await playing

  assert.equal(env.contexts.length, 1)
  assert.equal(document.body.children.length, 1)
  assert.equal(env.pending.size, 1)
  assert.equal(player.playing, true)
  player.destroy()
})

test('invalid structural updates leave the current renderer usable', async () => {
  const env = environment()
  const { player, video, container } = env.create()
  const canvas = container.children[0]

  assert.throws(() => player.updateConfig({ alphaScale: 2 }), /alphaScale/)
  assert.equal(container.children[0], canvas)
  assert.equal(env.videos.at(-1), video)
  assert.equal(env.contexts.length, 1)
  assert.equal(env.contexts[0].released, false)
  await player.play()
  assert.equal(player.playing, true)
  player.destroy()
})

test('onError throwing on context loss still releases the affected instance', async () => {
  const env = environment()
  const expected = new Error('user callback error')
  const { player, container } = env.create({ onError() { throw expected } })
  await player.play()
  container.children[0].dispatchEvent(new Event('webglcontextlost'))
  assert.deepEqual(env.eventErrors, [expected])
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  assert.equal(env.pending.size, 0)
  assert.ok(env.contexts.every(ctx => ctx.released))
})

test('throwing init-success callback releases the newly constructed player', () => {
  const env = environment()
  const container = new env.Element('div')
  const expected = new Error('init callback failed')
  let reported
  const player = new Render({
    container,
    src: 'fixture.mp4',
    onInitSuccess() { throw expected },
    onInitError(error) { reported = error },
  })
  assert.equal(reported, expected)
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  assert.ok(env.contexts.every(ctx => ctx.released))
  player.destroy()
})

test('unhandled initialization failure preserves the error and releases resources', () => {
  const env = environment({ failTexture: true })
  const container = new env.Element('div')
  assert.throws(() => new Render({ container, src: 'fixture.mp4' }), /texture allocation failed/)
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  assert.ok(env.contexts.every(ctx => ctx.released && ctx.resources.size === 0))
})

test('frequent mount/unmount releases every instance without waiting for garbage collection', async () => {
  const env = environment()
  for (let i = 0; i < 100; i++) {
    const { player, container } = env.create()
    await player.play()
    player.destroy()
    assert.equal(container.children.length, 0)
    assert.equal(document.body.children.length, 0)
    assert.equal(env.pending.size, 0)
    assert.ok(env.contexts.every(ctx => ctx.released && ctx.resources.size === 0))
  }
  assert.equal(env.contexts.length, 100)
})

test('frame upload errors stop the loop and release the player', async () => {
  const env = environment({ failDraw: true })
  const errors = []
  const { player, container } = env.create({ onError: error => errors.push(error) })
  await player.play()
  assert.equal(errors.length, 1)
  assert.match(errors[0].message, /frame upload failed/)
  assert.equal(container.children.length, 0)
  assert.equal(env.pending.size, 0)
  assert.equal(player.playing, false)
})

test('24fps throttling does not depend on an exact divisor of a 60Hz display', async () => {
  const env = environment()
  const { player } = env.create({ fps: 24 })
  await player.play()
  for (let i = 0; i <= 60; i++) env.tick(i * 1000 / 60)
  const draws = env.contexts[0].draws
  assert.ok(draws >= 24 && draws <= 26, `unexpected frame count: ${draws}`)
  player.destroy()
})

for (const mode of [{}, { webgl: false }, { alphaScale: 0 }]) {
  test(`autoDestroy survives a throwing onEnded callback: ${JSON.stringify(mode)}`, async () => {
    const env = environment(mode)
    const expected = new Error('ended callback failed')
    const { player, video, container } = env.create({ alphaScale: mode.alphaScale ?? 1, autoDestroy: true, onEnded() { throw expected } })
    await player.play()
    video.ended = true
    video.dispatchEvent(new Event('ended'))
    assert.deepEqual(env.eventErrors, [expected])
    assert.equal(container.children.length, 0)
    assert.equal(document.body.children.length, 0)
    assert.equal(env.pending.size, 0)
    assert.equal(player.playing, false)
    await assert.rejects(
      player.play(),
      error => isAlphaVideoPlayerError(error) &&
        error.code === 'PLAYER_DESTROYED' && error.action === 'play',
    )
  })
}

test('media errors still destroy the player if the onError callback throws', async () => {
  const env = environment()
  const expected = new Error('error callback failed')
  const { player, video, container } = env.create({ onError() { throw expected } })
  await player.play()
  video.dispatchEvent(new Event('error'))
  assert.deepEqual(env.eventErrors, [expected])
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  assert.equal(env.pending.size, 0)
  assert.throws(
    () => player.setPlaybackRate(2),
    error => isAlphaVideoPlayerError(error) &&
      error.code === 'PLAYER_DESTROYED' && error.action === 'setPlaybackRate',
  )
})

test('autoShow frame errors follow the same cleanup path as playback frame errors', () => {
  const env = environment({ failDraw: true })
  const errors = []
  const { player, container } = env.create({ autoShow: true, onError: error => errors.push(error) })
  assert.equal(errors.length, 1)
  assert.equal(env.eventErrors.length, 0)
  assert.equal(container.children.length, 0)
  assert.equal(document.body.children.length, 0)
  assert.equal(player.playing, false)
})

test('play rejection preserves the browser error even if onError throws', async () => {
  const env = environment()
  const original = new Error('NotAllowedError')
  let reported
  const { player, video } = env.create({ onError(error) { reported = error; throw new Error('callback error') } })
  video.playResult = Promise.reject(original)
  await assert.rejects(player.play(), error => error === original)
  assert.equal(reported, original)
  assert.equal(env.pending.size, 0)
  player.destroy()
})

test('two instances can play the same source with independent video and render resources', async () => {
  const env = environment()
  const a = env.create(), b = env.create()
  assert.equal(a.video.src, b.video.src)
  assert.notEqual(a.video, b.video)
  assert.notEqual(a.container.children[0], b.container.children[0])
  await Promise.all([a.player.play(), b.player.play()])
  a.player.setCurrentTime(3)
  assert.equal(b.video.currentTime, 0)
  a.player.destroy()
  env.tick(100)
  assert.ok(env.contexts[1].draws > 1)
  assert.equal(b.player.playing, true)
  b.player.destroy()
})

for (const fault of [{ failUnload: true }, { failDelete: true }, { failCancel: true }]) {
  test(`destroy remains non-throwing and completes cleanup when a cleanup API fails: ${JSON.stringify(fault)}`, async () => {
    const env = environment(fault)
    const { player, container } = env.create()
    await player.play()
    assert.doesNotThrow(() => player.destroy())
    assert.doesNotThrow(() => player.destroy())
    assert.equal(container.children.length, 0)
    assert.equal(document.body.children.length, 0)
    assert.equal(env.pending.size, 0)
    assert.ok(env.contexts.every(ctx => ctx.released && ctx.resources.size === 0))
  })
}
