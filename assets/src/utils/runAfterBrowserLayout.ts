// double requestAnimationFrame ensures all browser layout calculations are completed before executing
export function runAfterBrowserLayout(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fn()
    })
  })
}
