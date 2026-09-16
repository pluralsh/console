export function simulateInputChange(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  if (!input) {
    return
  }
  const proto =
    input instanceof HTMLTextAreaElement
      ? window?.HTMLTextAreaElement?.prototype
      : window?.HTMLInputElement?.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set

  if (typeof setter?.call === 'function') {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}
