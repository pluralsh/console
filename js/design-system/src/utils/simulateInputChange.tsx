export function simulateInputChange(input: HTMLInputElement, value: string) {
  if (!input) {
    return
  }
  const setter = Object.getOwnPropertyDescriptor(
    window?.HTMLInputElement?.prototype,
    'value'
  )?.set

  if (typeof setter?.call === 'function') {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}
