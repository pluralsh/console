import { WebglAddon } from '@xterm/addon-webgl'
import type { Terminal } from '@xterm/xterm'

// draws with WebGL after `open`, falling back to xterm's DOM renderer when the
// browser has no WebGL2 or drops the context
export function loadWebglRenderer(xterm: Terminal) {
  try {
    const webgl = new WebglAddon()
    webgl.onContextLoss(() => webgl.dispose())
    xterm.loadAddon(webgl)
  } catch {
    // keeps the DOM renderer
  }
}
