import assert from 'node:assert/strict'
import { test } from 'node:test'
import Render from '../dist/alpha-video-player-js.js'

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
      const state = { canvas: this, kind, released: false, draws: 0, resources: new Set() }
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

test('late play rejection after destruction preserves the original error without callbacks', async () => {
  const env = environment()
  let errors = 0
  const { player, video } = env.create({ onError: () => errors++ })
  const wait = deferred()
  video.playResult = wait.promise
  const playing = player.play()
  player.destroy()
  const original = new Error('browser aborted play')
  wait.reject(original)
  await assert.rejects(playing, error => error === original)
  assert.equal(errors, 0)
})

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
  const { player } = env.create()
  await player.play()
  await player.play({ videoFrame: false })
  assert.equal(env.pending.size, 1)
  assert.equal([...env.pending.values()][0].kind, 'raf')
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
