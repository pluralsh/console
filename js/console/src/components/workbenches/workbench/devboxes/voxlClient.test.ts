import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { connectVoxl, keysymOf } from './voxlClient'

class FakeSocket {
  static OPEN = 1
  static instances: FakeSocket[] = []
  readyState = 0
  binaryType = ''
  sent: string[] = []
  onopen?: () => void
  onclose?: () => void
  onmessage?: (e: { data: unknown }) => void
  constructor(
    public url: string,
    public protocols: string[]
  ) {
    FakeSocket.instances.push(this)
  }
  open() {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }
  message(data: unknown) {
    this.onmessage?.({ data })
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
}

const decoders = vi.hoisted(() => ({
  configured: [] as string[],
  chunks: [] as { type: string; timestamp: number }[],
  output: null as Nullable<(frame: unknown) => void>,
}))

class FakeDecoder {
  state = 'unconfigured'
  constructor({ output }: { output: (frame: unknown) => void }) {
    decoders.output = output
  }
  configure({ codec }: { codec: string }) {
    this.state = 'configured'
    decoders.configured.push(codec)
  }
  decode(chunk: { type: string; timestamp: number }) {
    decoders.chunks.push(chunk)
  }
  close() {
    this.state = 'closed'
  }
}

// type byte, flags (bit 0: keyframe), frame id (u32), pipe time (u32),
// stripe, pad, parts, then three pad bytes and the Annex-B payload
function videoMessage(frame: number, key: boolean, payload: number[]) {
  const b = new Uint8Array(16 + payload.length)
  b[0] = 0x01
  b[1] = key ? 1 : 0
  new DataView(b.buffer).setUint32(2, frame)
  b[10] = 0
  b[12] = 1
  b.set(payload, 16)
  return b.buffer
}
const SPS = [0, 0, 1, 0x67, 0x64, 0x00, 0x1f]

describe('connectVoxl', () => {
  let target: HTMLElement
  const drawImage = vi.fn()

  beforeEach(() => {
    FakeSocket.instances = []
    decoders.configured = []
    decoders.chunks = []
    drawImage.mockClear()
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.stubGlobal('VideoDecoder', FakeDecoder)
    vi.stubGlobal(
      'EncodedVideoChunk',
      class {
        type: string
        timestamp: number
        constructor(init: { type: string; timestamp: number }) {
          this.type = init.type
          this.timestamp = init.timestamp
        }
      }
    )
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage,
    })) as unknown as HTMLCanvasElement['getContext']
    target = document.createElement('div')
    target.getBoundingClientRect = () =>
      ({ width: 640, height: 400 }) as DOMRect
    document.body.append(target)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    target.remove()
  })

  const connect = () => {
    const onConnect = vi.fn()
    const onDisconnect = vi.fn()
    const onPick = vi.fn()
    const client = connectVoxl(target, 'wss://console/streams/s1', ['voxl'], {
      onConnect,
      onDisconnect,
      onPick,
    })
    const ws = FakeSocket.instances[0]
    ws.open()
    return { client, ws, onConnect, onDisconnect, onPick }
  }

  it('says whether the box can pick elements', () => {
    const plain = connect()
    plain.ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    expect(plain.onConnect).toHaveBeenCalledWith({ pick: false })
    plain.client.disconnect()
    FakeSocket.instances = []
    const picker = connect()
    picker.ws.message(
      JSON.stringify({ t: 'hello', w: 1280, h: 800, pick: true })
    )
    expect(picker.onConnect).toHaveBeenCalledWith({ pick: true })
  })

  it('picks an element and hands it on', () => {
    const { client, ws, onPick } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800, pick: true }))
    client.pick(true)
    expect(ws.sent).toContain('pk,1')
    const element = { url: 'http://localhost:3000/', selector: '#save' }
    ws.message(JSON.stringify({ t: 'pick', element }))
    expect(onPick).toHaveBeenCalledWith({ element })
    ws.message(JSON.stringify({ t: 'pick', error: 'no open tab' }))
    expect(onPick).toHaveBeenLastCalledWith({ error: 'no open tab' })
  })

  it('leaves picking on Escape instead of sending it to the page', () => {
    const { client, ws, onPick } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800, pick: true }))
    client.pick(true)
    const kbd = target.querySelector('textarea')!
    kbd.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })
    )
    expect(ws.sent).toContain('pk,0')
    expect(ws.sent).not.toContain('k,65307,1')
    ws.message(JSON.stringify({ t: 'pick', cancelled: true }))
    expect(onPick).toHaveBeenCalledWith({ cancelled: true })
    kbd.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })
    )
    expect(ws.sent).toContain('k,65307,1')
  })

  it('connects with the ticket, says hello, and answers pings', () => {
    const { ws, onConnect } = connect()
    expect(ws.url).toBe('wss://console/streams/s1')
    expect(ws.protocols).toEqual(['voxl'])
    expect(ws.sent).toEqual(['v,1', 'au,0'])
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    expect(onConnect).toHaveBeenCalledTimes(1)
    expect(target.querySelector('canvas')?.width).toBe(1280)
    expect((target.firstChild as HTMLElement).style.width).toBe('640px')
    ws.message(JSON.stringify({ t: 'ping', s: 42 }))
    expect(ws.sent).toContain('po,42')
  })

  it('asks for a screen the size of the view when the box resizes', () => {
    const { ws } = connect()
    ws.message(
      JSON.stringify({ t: 'hello', w: 2560, h: 1600, resize: { scale: 1 } })
    )
    expect(ws.sent).toContain('sz,640,400')
    ws.message(
      JSON.stringify({ t: 'hello', w: 640, h: 400, resize: { scale: 1 } })
    )
    expect(ws.sent.filter((s) => s.startsWith('sz,'))).toEqual(['sz,640,400'])
  })

  it("doesn't ask for a size when the box can't resize", () => {
    const { ws } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    expect(ws.sent.some((s) => s.startsWith('sz,'))).toBe(false)
  })

  it('decodes frames and acks them once painted', () => {
    const { ws } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    ws.message(videoMessage(7, true, SPS))
    expect(decoders.configured).toEqual(['avc1.64001f'])
    expect(decoders.chunks).toEqual([{ type: 'key', timestamp: 1 }])
    const frame = { timestamp: 1, close: vi.fn() }
    decoders.output?.(frame)
    expect(drawImage).toHaveBeenCalledWith(frame, 0, 0)
    expect(frame.close).toHaveBeenCalled()
    expect(ws.sent).toContain('a,7')
  })

  it('asks for a keyframe instead of decoding a delta first', () => {
    const { ws } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    ws.message(videoMessage(1, false, [0, 0, 1, 0x41]))
    expect(decoders.chunks).toHaveLength(0)
    expect(ws.sent).toContain('kf')
    expect(ws.sent).toContain('a,1')
  })

  it('sends pointer input in desktop pixels', () => {
    const { ws } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    const surface = target.firstChild as HTMLElement
    surface.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 640, height: 400 }) as DOMRect
    surface.setPointerCapture = () => {}
    const pointer = (type: string, x: number, y: number) =>
      surface.dispatchEvent(
        Object.assign(new MouseEvent(type, { clientX: x, clientY: y }), {
          pointerId: 1,
        })
      )
    pointer('pointerdown', 100, 50)
    pointer('pointerup', 100, 50)
    expect(ws.sent).toEqual(
      expect.arrayContaining(['m,200,100', 'b,1,1', 'b,1,0'])
    )
  })

  it("doesn't send input before the hello", () => {
    const { ws } = connect()
    const kbd = target.querySelector('textarea')!
    kbd.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }))
    expect(ws.sent.some((s) => s.startsWith('k,'))).toBe(false)
  })

  it('types keys as X keysyms', () => {
    const { ws } = connect()
    ws.message(JSON.stringify({ t: 'hello', w: 1280, h: 800 }))
    const kbd = target.querySelector('textarea')!
    kbd.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }))
    kbd.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }))
    expect(ws.sent).toEqual(expect.arrayContaining(['k,97,1', 'k,97,0']))
  })

  it('reports a dropped connection, but not its own disconnect', () => {
    const first = connect()
    first.ws.close()
    expect(first.onDisconnect).toHaveBeenCalledTimes(1)
    first.client.disconnect()
    FakeSocket.instances = []
    const second = connect()
    second.client.disconnect()
    expect(second.onDisconnect).not.toHaveBeenCalled()
    expect(target.childElementCount).toBe(0)
  })
})

describe('keysymOf', () => {
  it('maps a Mac viewer’s Command to the box’s Control', () => {
    expect(keysymOf({ code: 'MetaLeft', key: 'Meta' }, true)).toBe(0xffe3)
    expect(keysymOf({ code: 'MetaLeft', key: 'Meta' }, false)).toBe(0xffeb)
  })

  it('maps named keys and Unicode characters', () => {
    expect(keysymOf({ code: 'Enter', key: 'Enter' }, false)).toBe(0xff0d)
    expect(keysymOf({ code: 'KeyE', key: 'é' }, false)).toBe(0xe9)
    expect(keysymOf({ code: 'KeyE', key: 'ē' }, false)).toBe(0x01000113)
    expect(keysymOf({ code: 'KeyE', key: 'Dead' }, false)).toBe(0)
  })
})
