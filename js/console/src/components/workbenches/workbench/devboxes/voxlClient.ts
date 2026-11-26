// A viewer for voxl (github.com/tembo/voxl, MIT), which streams the box's
// display as H.264 over one WebSocket: binary messages start with a type byte,
// text messages are JSON from the server and short comma-separated commands from
// the viewer. Adapted from voxl's web client (web/src), keeping video, cursor,
// pointer, keyboard, clipboard text and dynamic resolution; audio, files and
// touch are off on the box.

export const VOXL_SUBPROTOCOL = 'voxl'

const BIN_VIDEO = 0x01
const BIN_CURSOR = 0x03
const VIDEO_HEADER_BYTES = 16
const RESIZE_DEBOUNCE_MS = 250

type Stripe = [y: number, h: number]
type ServerMessage =
  | {
      t: 'hello'
      w: number
      h: number
      stripes?: Stripe[]
      resize?: { scale: number }
      // the daemon picks elements on this stream
      pick?: boolean
    }
  | {
      t: 'pick'
      element?: VoxlPickedElement
      error?: string
      cancelled?: boolean
    }
  | { t: 'ping'; s: number }
  | { t: 'clip'; d: string }
  | { t: 'close' }

const cmd = {
  ack: (frame: number) => `a,${frame}`,
  move: (x: number, y: number) => `m,${x},${y}`,
  button: (button: number, down: boolean) => `b,${button},${down ? 1 : 0}`,
  scroll: (dx: number, dy: number) => `sp,${dx.toFixed(1)},${dy.toFixed(1)}`,
  key: (keysym: number, down: boolean) => `k,${keysym},${down ? 1 : 0}`,
  releaseAll: 'r',
  clipboard: (text: string) => `c,${text}`,
  video: (on: boolean) => `v,${on ? 1 : 0}`,
  audio: (on: boolean) => `au,${on ? 1 : 0}`,
  keyframe: 'kf',
  resize: (w: number, h: number) => `sz,${w},${h}`,
  pick: (on: boolean) => `pk,${on ? 1 : 0}`,
  pong: (sent: number) => `po,${sent}`,
}

// an element picked in the box's browser (the daemon's inspect mode)
export type VoxlPickedElement = {
  url: string
  title?: string
  selector: string
  tag: string
  text?: string
  html?: string
}

export type VoxlPickResult =
  | { element: VoxlPickedElement }
  | { error: string }
  | { cancelled: true }

export type VoxlClient = {
  disconnect: () => void
  focus: () => void
  // starts or stops picking an element; the result comes to onPick
  pick: (on: boolean) => void
}

export function webCodecsSupported() {
  return typeof window !== 'undefined' && 'VideoDecoder' in window
}

export function connectVoxl(
  target: HTMLElement,
  url: string,
  protocols: string[],
  {
    onConnect,
    onDisconnect,
    onPick,
  }: {
    onConnect: (features: { pick: boolean }) => void
    onDisconnect: () => void
    onPick?: (result: VoxlPickResult) => void
  }
): VoxlClient {
  if (!webCodecsSupported())
    throw new Error("this browser can't decode the box's video (WebCodecs)")

  const surface = document.createElement('div')
  Object.assign(surface.style, {
    position: 'relative',
    outline: 'none',
    touchAction: 'none',
  })
  surface.tabIndex = 0
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
  })
  // receives keys and pastes, so the browser's own shortcuts don't fire
  const kbd = document.createElement('textarea')
  kbd.setAttribute('aria-label', "Type into the box's browser")
  kbd.autocapitalize = 'off'
  kbd.spellcheck = false
  Object.assign(kbd.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    resize: 'none',
    pointerEvents: 'none',
  })
  surface.append(canvas, kbd)
  target.append(surface)

  const desk = { w: 0, h: 0 }
  let scale = 1
  let ctx: CanvasRenderingContext2D | null = null
  let closed = false
  let wantVideo = !document.hidden
  let picking = false
  // the clipboard text last exchanged, so a paste isn't echoed back
  let lastClip: Nullable<string> = null

  const ws = new WebSocket(url, protocols)
  ws.binaryType = 'arraybuffer'
  const send = (s: string) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(s)
  }
  const sendInput = (s: string) => {
    if (desk.w) send(s)
  }
  const video = createVideo(() => ctx, send)
  const cursor = createCursor(surface, () => scale)

  function layout() {
    if (!desk.w) return
    const { width, height } = target.getBoundingClientRect()
    scale = Math.min(width / desk.w, height / desk.h) || 1
    surface.style.width = `${desk.w * scale}px`
    surface.style.height = `${desk.h * scale}px`
    cursor.apply()
  }
  // Dynamic resolution: the box's screen follows this view, so pages lay out at
  // its size instead of being letterboxed. 0 until a hello says it's on.
  let resizeScale = 0
  let lastSize = ''
  let resizeTimer: ReturnType<typeof setTimeout> | undefined
  const requestSize = () => {
    const { width, height } = target.getBoundingClientRect()
    if (!resizeScale || !width || !height) return
    const size = cmd.resize(
      Math.round(width * resizeScale),
      Math.round(height * resizeScale)
    )
    if (size === lastSize) return
    lastSize = size
    send(size)
  }
  const observer = new ResizeObserver(() => {
    layout()
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(requestSize, RESIZE_DEBOUNCE_MS)
  })
  observer.observe(target)

  ws.onopen = () => {
    send(cmd.video(wantVideo))
    send(cmd.audio(false))
  }
  ws.onclose = () => {
    video.reset()
    desk.w = 0
    if (!closed) onDisconnect()
  }
  ws.onmessage = (e: MessageEvent<string | ArrayBuffer>) => {
    if (typeof e.data === 'string') return onText(e.data)
    const b = new Uint8Array(e.data)
    if (b[0] === BIN_VIDEO) video.onVideo(b)
    else if (b[0] === BIN_CURSOR) cursor.set(e.data)
  }

  function onText(s: string) {
    let m: ServerMessage
    try {
      m = JSON.parse(s)
    } catch {
      return
    }
    switch (m.t) {
      case 'ping':
        send(cmd.pong(m.s))
        break
      case 'close':
        ws.close()
        break
      case 'clip':
        lastClip = m.d
        void navigator.clipboard?.writeText(m.d).catch(() => {})
        break
      case 'pick':
        picking = false
        onPick?.(
          m.element
            ? { element: m.element }
            : m.error
              ? { error: m.error }
              : { cancelled: true }
        )
        break
      case 'hello': {
        const first = !desk.w
        desk.w = m.w
        desk.h = m.h
        if (canvas.width !== m.w || canvas.height !== m.h) {
          canvas.width = m.w
          canvas.height = m.h
        }
        ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
        video.build(m.stripes?.length ? m.stripes : [[0, m.h]])
        layout()
        resizeScale = m.resize?.scale ?? 0
        if (first) {
          lastSize = ''
          requestSize()
          onConnect({ pick: !!m.pick })
        }
        break
      }
    }
  }

  // pointer

  const toDesk = (p: { clientX: number; clientY: number }) => {
    const r = surface.getBoundingClientRect()
    const x = Math.round(((p.clientX - r.left) * desk.w) / r.width)
    const y = Math.round(((p.clientY - r.top) * desk.h) / r.height)
    return [
      Math.max(0, Math.min(desk.w - 1, x)),
      Math.max(0, Math.min(desk.h - 1, y)),
    ] as const
  }
  let lastMove = ''
  const move = (p: { clientX: number; clientY: number }) => {
    if (!desk.w) return
    const s = cmd.move(...toDesk(p))
    if (s === lastMove) return
    lastMove = s
    send(s)
  }
  // left, middle, right, back, forward as X buttons
  const BUTTONS = [1, 2, 3, 8, 9]
  let sx = 0
  let sy = 0
  let scrollQueued = false
  const queueScroll = (dx: number, dy: number) => {
    sx += dx
    sy += dy
    if (scrollQueued) return
    scrollQueued = true
    requestAnimationFrame(() => {
      scrollQueued = false
      if (Math.abs(sx) >= 0.5 || Math.abs(sy) >= 0.5)
        sendInput(cmd.scroll(sx, sy))
      sx = 0
      sy = 0
    })
  }
  const onPointerMove = (e: PointerEvent) => move(e)
  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault()
    kbd.focus({ preventScroll: true })
    move(e)
    try {
      surface.setPointerCapture(e.pointerId)
    } catch {
      // the pointer is already gone
    }
    sendInput(cmd.button(BUTTONS[e.button] || 1, true))
  }
  const onPointerUp = (e: PointerEvent) => {
    e.preventDefault()
    move(e)
    sendInput(cmd.button(BUTTONS[e.button] || 1, false))
  }
  const onPointerCancel = () => sendInput(cmd.releaseAll)
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    move(e)
    const k =
      ((e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1) * desk.w) /
      (surface.getBoundingClientRect().width || 1)
    queueScroll(e.deltaX * k, e.deltaY * k)
  }
  const onContextMenu = (e: Event) => e.preventDefault()

  // keyboard

  const isMac = /Mac|iPhone|iPad/.test(
    navigator.platform || navigator.userAgent
  )
  const down = new Map<string, number>()
  let pendingPaste: Nullable<{
    code: string
    ks: number
    timer: ReturnType<typeof setTimeout>
  }> = null
  const press = (code: string, ks: number) => {
    down.set(code, ks)
    sendInput(cmd.key(ks, true))
  }
  const tap = (ks: number) => {
    sendInput(cmd.key(ks, true))
    sendInput(cmd.key(ks, false))
  }
  const release = (code: string) => {
    const ks = down.get(code)
    if (ks === undefined) return
    down.delete(code)
    sendInput(cmd.key(ks, false))
  }
  const releaseAll = () => {
    down.clear()
    sendInput(cmd.releaseAll)
  }
  const flushPaste = () => {
    if (!pendingPaste) return
    const p = pendingPaste
    pendingPaste = null
    clearTimeout(p.timer)
    press(p.code, p.ks)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return
    // Escape leaves inspect mode instead of reaching the page
    if (picking && e.key === 'Escape') {
      e.preventDefault()
      setPicking(false)
      return
    }
    const ks = keysymOf(e, isMac)
    if (!ks) return
    const accel = isMac ? e.metaKey : e.ctrlKey
    if (accel && !e.altKey && (e.key === 'v' || e.key === 'V') && !e.repeat) {
      // let the paste event put the local clipboard on the box first
      pendingPaste = { code: e.code, ks, timer: setTimeout(flushPaste, 150) }
      return
    }
    e.preventDefault()
    const held = down.get(e.code)
    if (e.repeat && held !== undefined) {
      sendInput(cmd.key(held, true))
      return
    }
    press(e.code, ks)
  }
  const onKeyUp = (e: KeyboardEvent) => {
    e.preventDefault()
    if (pendingPaste?.code === e.code) flushPaste()
    release(e.code)
    // macOS swallows the keyups of keys released while Cmd is held
    if (isMac && (e.code === 'MetaLeft' || e.code === 'MetaRight'))
      for (const code of down.keys())
        if (!/^(Shift|Control|Alt|Meta)/.test(code)) release(code)
  }
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain')
    if (text && text !== lastClip) {
      lastClip = text
      sendInput(cmd.clipboard(text))
    }
    flushPaste()
  }
  const typeText = (text: string) => {
    for (const ch of text)
      tap(ch === '\n' ? XK_RETURN : charKeysym(ch.codePointAt(0)!))
  }
  const onCompositionEnd = (e: CompositionEvent) => {
    if (e.data) typeText(e.data)
    kbd.value = ''
  }
  const onInput = (e: Event) => {
    const ie = e as InputEvent
    if (ie.isComposing) return
    if (ie.inputType === 'insertText' && ie.data) typeText(ie.data)
    kbd.value = ''
  }

  const setPicking = (on: boolean) => {
    if (!desk.w || on === picking) return
    picking = on
    send(cmd.pick(on))
    if (on) kbd.focus({ preventScroll: true })
  }

  const onVisibility = () => {
    wantVideo = !document.hidden
    if (wantVideo) video.reset()
    send(cmd.video(wantVideo))
    if (document.hidden) releaseAll()
  }

  surface.addEventListener('pointermove', onPointerMove)
  surface.addEventListener('pointerdown', onPointerDown)
  surface.addEventListener('pointerup', onPointerUp)
  surface.addEventListener('pointercancel', onPointerCancel)
  surface.addEventListener('wheel', onWheel, { passive: false })
  surface.addEventListener('contextmenu', onContextMenu)
  surface.addEventListener('focus', () => kbd.focus({ preventScroll: true }))
  kbd.addEventListener('keydown', onKeyDown)
  kbd.addEventListener('keyup', onKeyUp)
  kbd.addEventListener('paste', onPaste)
  kbd.addEventListener('compositionend', onCompositionEnd)
  kbd.addEventListener('input', onInput)
  kbd.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', onVisibility)

  return {
    disconnect: () => {
      if (closed) return
      closed = true
      releaseAll()
      clearTimeout(pendingPaste?.timer)
      clearTimeout(resizeTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
      ws.close()
      video.reset()
      surface.remove()
    },
    focus: () => kbd.focus({ preventScroll: true }),
    pick: setPicking,
  }
}

// The screen arrives as independent H.264 stripes, one decoder each. A frame is
// a set of stripe updates sharing an id; frames are painted whole and in order,
// and acked so the server paces itself to the viewer.
function createVideo(
  context: () => CanvasRenderingContext2D | null,
  send: (s: string) => void
) {
  type StripeState = {
    dec: VideoDecoder | null
    codec: string | null
    waitingKey: boolean
    ts: number
    ids: Map<number, number>
  }
  type Part = { y: number; frame: VideoFrame }
  let layout: Stripe[] = []
  const stripes = new Map<number, StripeState>()
  const frames = new Map<number, { need: number; got: Part[] }>()
  const order: number[] = []
  let keyframeAsked = 0

  const reset = () => {
    for (const s of stripes.values())
      if (s.dec && s.dec.state !== 'closed')
        try {
          s.dec.close()
        } catch {
          // already closed by an error
        }
    stripes.clear()
    for (const f of frames.values()) for (const g of f.got) g.frame.close()
    frames.clear()
    order.length = 0
  }
  const askKeyframe = () => {
    const now = performance.now()
    if (now - keyframeAsked < 500) return
    keyframeAsked = now
    send(cmd.keyframe)
  }
  const stripe = (i: number) => {
    let s = stripes.get(i)
    if (!s) {
      s = { dec: null, codec: null, waitingKey: true, ts: 0, ids: new Map() }
      stripes.set(i, s)
    }
    return s
  }

  const flush = () => {
    while (order.length) {
      const id = order[0]
      const f = frames.get(id)
      if (f && f.got.length < f.need) return
      order.shift()
      frames.delete(id)
      if (!f) continue
      const ctx = context()
      for (const g of f.got) {
        ctx?.drawImage(g.frame, 0, g.y)
        g.frame.close()
      }
      send(cmd.ack(id))
    }
  }

  const decoder = (i: number, codec: string) => {
    const s = stripe(i)
    const dec = new VideoDecoder({
      output: (frame) => {
        const id = s.ids.get(frame.timestamp)
        s.ids.delete(frame.timestamp)
        const f = id === undefined ? undefined : frames.get(id)
        if (!f) {
          frame.close()
          return
        }
        f.got.push({ y: layout[i]?.[0] ?? 0, frame })
        flush()
      },
      error: () => {
        reset()
        askKeyframe()
      },
    })
    dec.configure({
      codec,
      optimizeForLatency: true,
      hardwareAcceleration: 'no-preference',
    })
    return dec
  }

  const onVideo = (b: Uint8Array) => {
    const u32 = (i: number) =>
      ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
    const key = (b[1] & 1) === 1
    const id = u32(2)
    const i = b[10]
    const parts = b[12]
    const data = b.subarray(VIDEO_HEADER_BYTES)
    let f = frames.get(id)
    if (!f) {
      f = { need: parts, got: [] }
      frames.set(id, f)
      order.push(id)
    }
    const s = stripe(i)
    if (s.waitingKey && !key) {
      f.need--
      askKeyframe()
      flush()
      return
    }
    if (key) {
      const codec = codecFromSps(data) || 'avc1.640034'
      if (!s.dec || s.dec.state === 'closed' || codec !== s.codec) {
        if (s.dec && s.dec.state !== 'closed') s.dec.close()
        s.codec = codec
        s.ids.clear()
        try {
          s.dec = decoder(i, codec)
        } catch {
          f.need--
          flush()
          return
        }
      }
      s.waitingKey = false
    }
    const ts = ++s.ts
    s.ids.set(ts, id)
    try {
      s.dec!.decode(
        new EncodedVideoChunk({
          type: key ? 'key' : 'delta',
          timestamp: ts,
          data,
        })
      )
    } catch {
      reset()
      askKeyframe()
    }
  }

  return {
    build: (list: Stripe[]) => {
      layout = list
      reset()
    },
    onVideo,
    reset,
  }
}

const hex2 = (x: number) => x.toString(16).padStart(2, '0')

// avc1.PPCCLL from the first SPS in an Annex-B keyframe
function codecFromSps(d: Uint8Array): Nullable<string> {
  for (let i = 0; i + 4 < d.length; i++)
    if (
      d[i] === 0 &&
      d[i + 1] === 0 &&
      d[i + 2] === 1 &&
      (d[i + 3] & 0x1f) === 7
    )
      return `avc1.${hex2(d[i + 4])}${hex2(d[i + 5])}${hex2(d[i + 6])}`
  return null
}

// The box's cursor, drawn by the browser so moving it has no stream latency.
// Cursor messages: type byte, pad, width, height, hot x, hot y (u16 each),
// serial (u32), then RGBA.
function createCursor(surface: HTMLElement, scale: () => number) {
  const MIN_PX = 24
  const MAX_PX = 128
  let msg: Nullable<ArrayBuffer> = null
  const scaled = document.createElement('canvas')

  const apply = () => {
    if (!msg) return
    const v = new DataView(msg)
    const w = v.getUint16(2)
    const h = v.getUint16(4)
    const hx = v.getUint16(6)
    const hy = v.getUint16(8)
    if (!w || !h) {
      surface.style.cursor = 'none'
      return
    }
    const src = document.createElement('canvas')
    src.width = w
    src.height = h
    src
      .getContext('2d')
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(msg, 14, w * h * 4), w, h),
        0,
        0
      )
    const size = Math.max(w, h)
    const s = Math.min(Math.max(scale(), MIN_PX / size), MAX_PX / size)
    scaled.width = Math.max(1, Math.round(w * s))
    scaled.height = Math.max(1, Math.round(h * s))
    const cx = scaled.getContext('2d')
    if (!cx) return
    cx.imageSmoothingQuality = 'high'
    cx.drawImage(src, 0, 0, scaled.width, scaled.height)
    surface.style.cursor = `url(${scaled.toDataURL('image/png')}) ${Math.round(hx * s)} ${Math.round(hy * s)}, default`
  }

  return {
    set: (buf: ArrayBuffer) => {
      msg = buf
      apply()
    },
    apply,
  }
}

// Keys are sent as X keysyms; the box maps them to keycodes, so the viewer's
// layout decides what each key types.
const NAMED: Record<string, number> = {
  Backspace: 0xff08,
  Tab: 0xff09,
  Enter: 0xff0d,
  Escape: 0xff1b,
  Delete: 0xffff,
  Home: 0xff50,
  ArrowLeft: 0xff51,
  ArrowUp: 0xff52,
  ArrowRight: 0xff53,
  ArrowDown: 0xff54,
  PageUp: 0xff55,
  PageDown: 0xff56,
  End: 0xff57,
  Insert: 0xff63,
  CapsLock: 0xffe5,
  NumLock: 0xff7f,
  ScrollLock: 0xff14,
  Pause: 0xff13,
  PrintScreen: 0xff61,
  ContextMenu: 0xff67,
  AltGraph: 0xfe03,
  ' ': 0x20,
}
for (let i = 1; i <= 24; i++) NAMED[`F${i}`] = 0xffbd + i
const BY_CODE: Record<string, number> = {
  ShiftLeft: 0xffe1,
  ShiftRight: 0xffe2,
  AltLeft: 0xffe9,
  AltRight: 0xffea,
  NumpadEnter: 0xff0d,
}
const XK_RETURN = 0xff0d

// Latin-1 directly, the rest of Unicode at 0x01000000 + its code point
const charKeysym = (cp: number) =>
  (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)
    ? cp
    : 0x01000000 + cp

export function keysymOf(
  e: Pick<KeyboardEvent, 'code' | 'key'>,
  isMac: boolean
): number {
  const isCtrl = e.code.startsWith('Control')
  const isMeta = e.code.startsWith('Meta') || e.code.startsWith('OS')
  if (isCtrl || isMeta) {
    const right = e.code.endsWith('Right')
    // a Mac viewer's Command is the box's Control, so its shortcuts work
    if (isCtrl || (isMac && e.code.startsWith('Meta')))
      return right ? 0xffe4 : 0xffe3
    return right ? 0xffec : 0xffeb
  }
  if (BY_CODE[e.code] !== undefined)
    return e.code === 'AltRight' && e.key === 'AltGraph'
      ? 0xfe03
      : BY_CODE[e.code]
  const k = e.key
  if (NAMED[k] !== undefined) return NAMED[k]
  if (!k || k === 'Dead' || k === 'Unidentified' || k === 'Process') return 0
  if ([...k].length !== 1) return 0
  return charKeysym(k.codePointAt(0)!)
}
